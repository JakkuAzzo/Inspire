#include "PluginEditor.h"
#include <cstdlib>
#include <cmath>


juce::File defaultDownloadDir()
{
  return juce::File::getSpecialLocation(juce::File::userDocumentsDirectory)
    .getChildFile("InspireVST");
}

class LambdaJob final : public juce::ThreadPoolJob
{
public:
  explicit LambdaJob(std::function<void()> job)
    : juce::ThreadPoolJob("InspireVSTJob"), task(std::move(job))
  {
  }

  juce::ThreadPoolJob::JobStatus runJob() override
  {
    task();
    return juce::ThreadPoolJob::jobHasFinished;
  }
  
private:
  std::function<void()> task;
};

static juce::String makePluginInstanceId(const void* instancePtr)
{
  const auto nowMs = static_cast<uint64_t>(juce::Time::currentTimeMillis());
  const auto ptrBits = static_cast<uint64_t>(reinterpret_cast<uintptr_t>(instancePtr));
  const auto randomBits = static_cast<uint64_t>(juce::Random::getSystemRandom().nextInt64());
  juce::String id = juce::String::toHexString(static_cast<int64_t>(nowMs)).toUpperCase()
    + juce::String::toHexString(static_cast<int64_t>(randomBits ^ (ptrBits << 7))).toUpperCase();

  id = id.retainCharacters("0123456789ABCDEF");
  if (id.length() < 12)
    id = id.paddedLeft('0', 12);

  return id.substring(0, 12);
}

static juce::String guessMimeTypeForFile(const juce::File& file)
{
  auto ext = file.getFileExtension().toLowerCase();
  if (ext == ".wav") return "audio/wav";
  if (ext == ".mp3") return "audio/mpeg";
  if (ext == ".midi" || ext == ".mid") return "audio/midi";
  if (ext == ".aif" || ext == ".aiff") return "audio/aiff";
  if (ext == ".flac") return "audio/flac";
  return "application/octet-stream";
}

static juce::String shortInstanceId(const juce::String& instanceId)
{
  return instanceId.substring(0, juce::jmin(8, instanceId.length()));
}

static int countJsonArrayItems(const juce::String& payload)
{
  if (payload.trim().isEmpty())
    return 0;

  const auto parsed = juce::JSON::parse(payload);
  if (parsed.isArray() && parsed.getArray() != nullptr)
    return parsed.getArray()->size();

  return 0;
}

static bool tokenLooksLikeJwt(const juce::String& token)
{
  const auto trimmed = token.trim();
  if (trimmed.isEmpty())
    return false;

  int dotCount = 0;
  for (auto c : trimmed)
  {
    if (c == '.')
      ++dotCount;
  }

  return dotCount == 2;
}

static bool isAuthTokenFailureMessage(const juce::String& message)
{
  if (message.isEmpty())
    return false;

  return message.containsIgnoreCase("invalid session token")
    || message.containsIgnoreCase("session expired")
    || message.containsIgnoreCase("missing bearer token")
    || message.containsIgnoreCase("jwt");
}

// Style text inputs - matching web app glassmorphism
  auto styleTextInput = [](juce::TextEditor& input) {
    input.setColour(juce::TextEditor::backgroundColourId, juce::Colour(10, 16, 37).withAlpha(0.62f));
    input.setColour(juce::TextEditor::textColourId, juce::Colour(241, 245, 255).withAlpha(0.96f));
    input.setColour(juce::TextEditor::highlightColourId, juce::Colour(236, 72, 153).withAlpha(0.4f));
    input.setColour(juce::TextEditor::outlineColourId, juce::Colour(148, 163, 184).withAlpha(0.18f));
    input.setFont(juce::Font(juce::FontOptions(13.0f)));
    input.setBorder(juce::BorderSize<int>(1));
  };

  
  InspireVSTAudioProcessorEditor::InspireVSTAudioProcessorEditor(InspireVSTAudioProcessor& processorRef)
    : juce::AudioProcessorEditor(&processorRef), processor(processorRef), client(), inspirationListModel(*this), packListModel(*this), listModel(*this)
  {
    setSize(960, 540);
    loadRoomCode();
    
    // Generate unique plugin instance ID
    pluginInstanceID = makePluginInstanceId(this);
    syncTrackId = "vst-" + pluginInstanceID;
    sessionStartTimeMs = juce::Time::currentTimeMillis();

    serverUrlInput.setTextToShowWhenEmpty("Server URL", juce::Colour(241, 245, 255).withAlpha(0.5f));
    serverUrlInput.setText(detectLocalServerUrl());
    styleTextInput(serverUrlInput);
  
  roomIdInput.setTextToShowWhenEmpty("Room ID (optional)", juce::Colour(241, 245, 255).withAlpha(0.5f));
  styleTextInput(roomIdInput);
  
  codeInput.setTextToShowWhenEmpty("Room Code", juce::Colour(241, 245, 255).withAlpha(0.5f));
  codeInput.setPasswordCharacter('*');
  if (pendingRoomCode.isNotEmpty())
  {
    codeInput.setText(pendingRoomCode, false);
  }
  styleTextInput(codeInput);
  
  passwordInput.setTextToShowWhenEmpty("Password (optional)", juce::Colour(241, 245, 255).withAlpha(0.5f));
  passwordInput.setPasswordCharacter('*');
  styleTextInput(passwordInput);

  // Style buttons - accent colors matching modes (cyan for VST as default)
  auto styleButton = [](juce::TextButton& btn, juce::Colour accentColour) {
    btn.setColour(juce::TextButton::buttonColourId, accentColour.withAlpha(0.7f));
    btn.setColour(juce::TextButton::buttonOnColourId, accentColour.withAlpha(0.9f));
    btn.setColour(juce::TextButton::textColourOffId, juce::Colour(241, 245, 255));
    btn.setColour(juce::TextButton::textColourOnId, juce::Colour(241, 245, 255));
  };

  juce::Colour cyanAccent(34, 211, 238);  // #22d3ee - Producer cyan
  juce::Colour pinkAccent(236, 72, 153);  // #ec4899 - Lyricist pink
  styleButton(guestButton, cyanAccent);
  styleButton(signupButton, pinkAccent);
  styleButton(loginButton, cyanAccent);
  styleButton(joinButton, cyanAccent);
  styleButton(createRoomButton, cyanAccent);
  styleButton(viewActiveRoomsButton, cyanAccent);
  styleButton(refreshButton, cyanAccent);
  styleButton(downloadButton, cyanAccent);

  guestButton.onClick = [this] { startGuestMode(); };
  signupButton.onClick = [this] { startSignup(); };
  loginButton.onClick = [this] { startLogin(); };
  joinButton.onClick = [this] { startJoin(); };
  createRoomButton.onClick = [this] { startCreateRoom(); };
  viewActiveRoomsButton.onClick = [this] { startViewActiveRooms(); };
  refreshButton.onClick = [this] {
    if (selectedMode == "updates")
    {
      if (isRelayOrCreateRole())
        attemptRoleAttachIfNeeded();
      refreshInstancesList();
      refreshSyncStatus();
      fetchCollabVisualizationForUpdates(true);
      setStatus("Project state refreshed.");
      return;
    }
    refreshFiles();
  };
  downloadButton.onClick = [this] { downloadSelected(); };

  updatesCard.onClick = [this] { selectUpdates(); };

  // Back button and mode title
  backButton.onClick = [this] {
    // Phase 3: Disconnect WebSocket and stop polling before leaving Updates mode
    if (selectedMode == "updates")
    {
      stopWebSocketSync();
    }

    // Exit mode view and restore mode cards
    // If updates UI was added, remove it now
    if (pushTrackButton.getParentComponent() != nullptr)
    {
      removeChildComponent(&pushTrackButton);
      pushTrackButton.setVisible(false);
    }
    if (pullTrackButton.getParentComponent() != nullptr)
    {
      removeChildComponent(&pullTrackButton);
      pullTrackButton.setVisible(false);
    }
    if (attachArtifactButton.getParentComponent() != nullptr)
    {
      removeChildComponent(&attachArtifactButton);
      attachArtifactButton.setVisible(false);
    }
    if (pushLogDisplay.getParentComponent() != nullptr)
    {
      removeChildComponent(&pushLogDisplay);
      pushLogDisplay.setVisible(false);
    }
    if (pushLogLabel.getParentComponent() != nullptr)
    {
      removeChildComponent(&pushLogLabel);
      pushLogLabel.setVisible(false);
    }

    selectedMode = "";
    currentUIState = UIState::InitialView;
    currentDisplayedPack = juce::var();
    generatedPackItems.clear();
    clearPackCardButtons();
    modeTitleLabel.setText("", juce::dontSendNotification);
    modeTitleLabel.setVisible(false);
    backButton.setVisible(false);
    addErrorLog("Exited mode view");
    updateUIForAuthState();
  };
  modeTitleLabel.setVisible(false);
  backButton.setVisible(false);
  
  // Mode card buttons - styled with accent colors matching web app modes
  juce::Colour writerAccent(236, 72, 153);   // #ec4899 - Lyricist pink
  juce::Colour producerAccent(34, 211, 238); // #22d3ee - Producer cyan
  juce::Colour editorAccent(168, 85, 247);   // #a855f7 - Editor purple
  juce::Colour updatesAccent(148, 163, 184); // #94a3b8 - Neutral slate
  
  styleButton(writerLabCard, writerAccent);
  styleButton(producerLabCard, producerAccent);
  styleButton(editorSuiteCard, editorAccent);
  styleButton(updatesCard, updatesAccent);
  styleButton(searchCard, juce::Colour(120, 204, 120));
  // Search input + go button (transient UI shown when in Search mode)
  searchInput.setTextToShowWhenEmpty("Search community packs", juce::Colour(241, 245, 255).withAlpha(0.45f));
  searchInput.setMultiLine(false);
  searchInput.setFont(juce::Font(juce::FontOptions(13.0f)));
  searchInput.setColour(juce::TextEditor::backgroundColourId, juce::Colour(10, 16, 37).withAlpha(0.62f));
  searchInput.setColour(juce::TextEditor::textColourId, juce::Colour(241, 245, 255).withAlpha(0.96f));
  searchGoButton.setColour(juce::TextButton::buttonColourId, juce::Colour(34, 211, 238).withAlpha(0.9f));
  searchGoButton.onClick = [this] { 
    searchPage = 1;
    const juce::String q = searchInput.getText().trim();
    const auto serverUrl = serverUrlInput.getText();
    setBusy(true);
    setStatus("Searching community...");
    runAsync([this, serverUrl, q] {
      const auto response = client.searchCommunityFeed(serverUrl, q, searchPage, searchPageSize, sessionToken);
      juce::MessageManager::callAsync([this, response] {
        packItems.clear();
        if (response.isNotEmpty())
        {
          auto parsed = juce::JSON::parse(response);
          if (parsed.isObject())
          {
            auto* dob = parsed.getDynamicObject();
            auto items = dob->getProperty("items");
            if (items.isArray()) for (auto& it : *items.getArray()) packItems.add(it);
            // optionally read pagination info
            auto totalVar = dob->getProperty("total");
            int total = 0;
            if (totalVar.isDouble() || totalVar.isInt()) total = static_cast<int>(double(totalVar));
            searchPageLabel.setText("Page " + juce::String(searchPage) + (total>0?" — total:"+juce::String(total):""), juce::dontSendNotification);
          }
          else if (parsed.isArray())
          {
            for (auto& it : *parsed.getArray()) packItems.add(it);
            searchPageLabel.setText("Page " + juce::String(searchPage), juce::dontSendNotification);
          }
        }
        packList.updateContent();
        setBusy(false);
        setStatus("Search complete");
      });
    });
  };
  
  // pagination buttons
  searchPrevButton.onClick = [this] {
    if (searchPage > 1) { searchPage--; searchGoButton.triggerClick(); }
  };
  searchNextButton.onClick = [this] {
    searchPage++; searchGoButton.triggerClick();
  };
  styleButton(backButton, juce::Colour(94, 92, 230));
  styleButton(pushTrackButton, producerAccent);
  styleButton(pullTrackButton, producerAccent);
  styleButton(attachArtifactButton, juce::Colour(120, 204, 120));
  pushTrackButton.setButtonText("Push This Instance");
  pullTrackButton.setButtonText("Pull Latest To This Instance");

  sourceInstanceLabel.setText("Source", juce::dontSendNotification);
  sourceInstanceLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.8f));
  sourceInstanceLabel.setFont(juce::Font(juce::FontOptions(11.0f, juce::Font::bold)));
  sourceInstanceLabel.setJustificationType(juce::Justification::centredLeft);

  sourceInstanceCombo.setTextWhenNothingSelected("Select source instance");
  sourceInstanceCombo.onChange = [this] {
    const int idx = sourceInstanceCombo.getSelectedItemIndex();
    if (idx >= 0 && idx < sourceOptionInstanceIds.size())
    {
      selectedSourceInstanceId = sourceOptionInstanceIds[idx];
      selectedSourceTrackId = sourceOptionTrackIds[idx];
      updateUIForAuthState();
    }
  };

  destinationInstanceLabel.setText("Destination", juce::dontSendNotification);
  destinationInstanceLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.8f));
  destinationInstanceLabel.setFont(juce::Font(juce::FontOptions(11.0f, juce::Font::bold)));
  destinationInstanceLabel.setJustificationType(juce::Justification::centredLeft);

  destinationInstanceValue.setText("This instance " + shortInstanceId(pluginInstanceID), juce::dontSendNotification);
  destinationInstanceValue.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.92f));
  destinationInstanceValue.setFont(juce::Font(juce::FontOptions(11.0f)));
  destinationInstanceValue.setJustificationType(juce::Justification::centredLeft);
  
  writerLabCard.onClick = [this] { selectWriterLab(); };
  producerLabCard.onClick = [this] { selectProducerLab(); };
  editorSuiteCard.onClick = [this] { selectEditorSuite(); };
  updatesCard.onClick = [this] { selectUpdates(); };
  searchCard.onClick = [this] { selectSearch(); };
  pushTrackButton.onClick = [this] { pushTrack(); };
  pullTrackButton.onClick = [this] { pullTrack(); };
  attachArtifactButton.onClick = [this] {
    if (!inRoom || currentSyncRoomCode.isEmpty())
    {
      setStatus("Join a room before attaching artifacts");
      return;
    }

    artifactFileChooser = std::make_unique<juce::FileChooser>(
      "Select artifact to attach",
      juce::File(),
      "*.wav;*.mp3;*.mid;*.midi"
    );

    artifactFileChooser->launchAsync(
      juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles,
      [this](const juce::FileChooser& chooser)
      {
        const auto chosen = chooser.getResult();
        artifactFileChooser.reset();
        if (!chosen.existsAsFile())
          return;

        pendingArtifactFile = chosen;
        pendingArtifactMimeType = guessMimeTypeForFile(pendingArtifactFile);
        setStatus("Selected artifact: " + pendingArtifactFile.getFileName() + " (will upload on next push)");
        addErrorLog("Artifact queued for push: " + pendingArtifactFile.getFileName());
      }
    );
  };
  
  // Push log display - read-only text editor styled like glassmorphism card
  pushLogDisplay.setMultiLine(true);
  pushLogDisplay.setReadOnly(true);
  pushLogDisplay.setScrollbarsShown(true);
  pushLogDisplay.setColour(juce::TextEditor::backgroundColourId, juce::Colour(10, 16, 37).withAlpha(0.62f));
  pushLogDisplay.setColour(juce::TextEditor::textColourId, juce::Colour(241, 245, 255).withAlpha(0.9f));
  pushLogDisplay.setColour(juce::TextEditor::outlineColourId, juce::Colour(148, 163, 184).withAlpha(0.18f));
  pushLogDisplay.setFont(juce::Font(juce::FontOptions(11.0f)));
  pushLogDisplay.setText("Recent push/pull activity will appear here...", false);
  
  pushLogLabel.setText("Room Activity", juce::dontSendNotification);
  pushLogLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.8f));
  pushLogLabel.setFont(juce::Font(juce::FontOptions(12.0f, juce::Font::bold)));
  pushLogLabel.setJustificationType(juce::Justification::centredLeft);

  lastTransferLabel.setText("Last Transfer", juce::dontSendNotification);
  lastTransferLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.8f));
  lastTransferLabel.setFont(juce::Font(juce::FontOptions(12.0f, juce::Font::bold)));
  lastTransferLabel.setJustificationType(juce::Justification::centredLeft);

  lastTransferDisplay.setMultiLine(true);
  lastTransferDisplay.setReadOnly(true);
  lastTransferDisplay.setScrollbarsShown(true);
  lastTransferDisplay.setColour(juce::TextEditor::backgroundColourId, juce::Colour(10, 16, 37).withAlpha(0.62f));
  lastTransferDisplay.setColour(juce::TextEditor::textColourId, juce::Colour(241, 245, 255).withAlpha(0.9f));
  lastTransferDisplay.setColour(juce::TextEditor::outlineColourId, juce::Colour(148, 163, 184).withAlpha(0.18f));
  lastTransferDisplay.setFont(juce::Font(juce::FontOptions(11.0f, juce::Font::plain)));
  lastTransferDisplay.setText(
    "No transfer has run yet.\n"
    "Run Push This Instance or Pull Latest To This Instance.",
    false
  );

  recordReadyLabel.setText("Record-Ready Check", juce::dontSendNotification);
  recordReadyLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.8f));
  recordReadyLabel.setFont(juce::Font(juce::FontOptions(12.0f, juce::Font::bold)));
  recordReadyLabel.setJustificationType(juce::Justification::centredLeft);

  recordReadyDisplay.setMultiLine(true);
  recordReadyDisplay.setReadOnly(true);
  recordReadyDisplay.setScrollbarsShown(false);
  recordReadyDisplay.setColour(juce::TextEditor::backgroundColourId, juce::Colour(10, 16, 37).withAlpha(0.62f));
  recordReadyDisplay.setColour(juce::TextEditor::textColourId, juce::Colour(241, 245, 255).withAlpha(0.9f));
  recordReadyDisplay.setColour(juce::TextEditor::outlineColourId, juce::Colour(148, 163, 184).withAlpha(0.18f));
  recordReadyDisplay.setFont(juce::Font(juce::FontOptions(11.0f, juce::Font::plain)));
  recordReadyDisplay.setText(
    "Checking host transport and MIDI output...",
    false
  );

  // Phase 1: VST Instance Broadcasting - Instances list display
  instancesListLabel.setText("Active VST Instances", juce::dontSendNotification);
  instancesListLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.8f));
  instancesListLabel.setFont(juce::Font(juce::FontOptions(12.0f, juce::Font::bold)));
  instancesListLabel.setJustificationType(juce::Justification::centredLeft);
  
  instancesDisplay.setMultiLine(true);
  instancesDisplay.setReadOnly(true);
  instancesDisplay.setScrollbarsShown(true);
  instancesDisplay.setColour(juce::TextEditor::backgroundColourId, juce::Colour(10, 16, 37).withAlpha(0.62f));
  instancesDisplay.setColour(juce::TextEditor::textColourId, juce::Colour(241, 245, 255).withAlpha(0.9f));
  instancesDisplay.setColour(juce::TextEditor::outlineColourId, juce::Colour(148, 163, 184).withAlpha(0.18f));
  instancesDisplay.setFont(juce::Font(juce::FontOptions(11.0f, juce::Font::plain)));
  instancesDisplay.setText("Loading instances...", false);
  
  syncStatusIndicator.setText("Sync: Checking...", juce::dontSendNotification);
  syncStatusIndicator.setColour(juce::Label::textColourId, juce::Colour(148, 163, 184).withAlpha(0.9f));
  syncStatusIndicator.setFont(juce::Font(juce::FontOptions(11.0f, juce::Font::bold)));
  syncStatusIndicator.setJustificationType(juce::Justification::centredRight);
  
  addChildComponent(instancesListLabel);
  addChildComponent(instancesDisplay);
  addChildComponent(syncStatusIndicator);
  addChildComponent(sourceInstanceLabel);
  addChildComponent(sourceInstanceCombo);
  addChildComponent(destinationInstanceLabel);
  addChildComponent(destinationInstanceValue);
  addChildComponent(lastTransferLabel);
  addChildComponent(lastTransferDisplay);
  addChildComponent(recordReadyLabel);
  addChildComponent(recordReadyDisplay);

  statusLabel.setText("Ready", juce::dontSendNotification);
  statusLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.7f));
  statusLabel.setFont(juce::Font(juce::FontOptions(11.0f)));
  
  tokenLabel.setText("Session: -", juce::dontSendNotification);
  tokenLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.6f));
  tokenLabel.setFont(juce::Font(juce::FontOptions(10.0f)));
  tokenLabel.setJustificationType(juce::Justification::centredLeft);

  syncStatusLabel.setText("Sync: Ready", juce::dontSendNotification);
  syncStatusLabel.setColour(juce::Label::textColourId, juce::Colour(34, 211, 238).withAlpha(0.7f));
  syncStatusLabel.setFont(juce::Font(juce::FontOptions(10.0f)));
  syncStatusLabel.setJustificationType(juce::Justification::centredRight);

  authStatusLabel.setText("Not Authenticated", juce::dontSendNotification);
  authStatusLabel.setColour(juce::Label::textColourId, juce::Colour(248, 113, 113).withAlpha(0.9f));
  authStatusLabel.setFont(juce::Font(juce::FontOptions(11.0f, juce::Font::bold)));
  authStatusLabel.setJustificationType(juce::Justification::centredLeft);

  roleStatusLabel.setText("Role: MASTER", juce::dontSendNotification);
  roleStatusLabel.setColour(juce::Label::textColourId, juce::Colour(16, 185, 129).withAlpha(0.95f));
  roleStatusLabel.setFont(juce::Font(juce::FontOptions(11.0f, juce::Font::bold)));
  roleStatusLabel.setJustificationType(juce::Justification::centredRight);

  roleBadgeLabel.setText("MASTER", juce::dontSendNotification);
  roleBadgeLabel.setColour(juce::Label::textColourId, juce::Colour(16, 185, 129).withAlpha(0.95f));
  roleBadgeLabel.setFont(juce::Font(juce::FontOptions(11.0f, juce::Font::bold)));
  roleBadgeLabel.setJustificationType(juce::Justification::centred);

  fileList.setModel(&listModel);

  // Pack list model and generate button - triggers pack generation
  packList.setModel(&packListModel);
  
  // Inspiration queue list model
  inspirationQueueList.setModel(&inspirationListModel);
  
  generatePackButton.onClick = [this] {
    // Generate pack with selected filters
    // Note: State transition to GeneratedView happens in the async callback
    // after the pack is successfully generated and added to packItems
    generatePackForSelection();
  };
  
  // Remix button - generates a new pack while keeping current filters
  remixPackButton.onClick = [this] { 
    if (currentDisplayedPack.isObject())
    {
      generatePackForSelection();
    }
    else
    {
      setStatus("Select a pack first to remix it");
    }
  };
  // Style remix button with green accent to indicate action/remixing
  remixPackButton.setColour(juce::TextButton::buttonColourId, juce::Colour(120, 204, 120).withAlpha(0.85f));
  remixPackButton.setColour(juce::TextButton::textColourOffId, juce::Colour(241, 245, 255));
  remixPackButton.setColour(juce::TextButton::textColourOnId, juce::Colour(241, 245, 255));

  // Style top-right icon buttons (small compact icons)
  generatePackButton.setColour(juce::TextButton::buttonColourId, juce::Colour(34, 211, 238).withAlpha(0.7f));
  generatePackButton.setColour(juce::TextButton::textColourOffId, juce::Colour(241, 245, 255));
  generatePackButton.setButtonText("Generate");
  
  savePackButton.setColour(juce::TextButton::buttonColourId, juce::Colour(34, 211, 238).withAlpha(0.7f));
  savePackButton.setColour(juce::TextButton::textColourOffId, juce::Colour(241, 245, 255));
  savePackButton.setButtonText("Save");
  
  openNotepadButton.setColour(juce::TextButton::buttonColourId, juce::Colour(34, 211, 238).withAlpha(0.7f));
  openNotepadButton.setColour(juce::TextButton::textColourOffId, juce::Colour(241, 245, 255));
  openNotepadButton.setButtonText("Notepad");

  // Style export button with slate color
  exportPackButton.setColour(juce::TextButton::buttonColourId, juce::Colour(148, 163, 184).withAlpha(0.75f));
  exportPackButton.setColour(juce::TextButton::textColourOffId, juce::Colour(241, 245, 255));
  exportPackButton.setColour(juce::TextButton::textColourOnId, juce::Colour(241, 245, 255));

  // Filter control component for pack generation
  filterControl = std::make_unique<FilterControlComponent>();
  filterControl->setFilter(currentFilters);
  filterControl->setOnFilterChanged([this](const RelevanceFilter& filter) {
    this->onFilterChanged(filter);
  });
  addAndMakeVisible(*filterControl);

  // Pack detail component and actions
  packDetailComponent = std::make_unique<PackDetailComponent>();
  packDetailComponent->addListener(&packDetailListener);

  // Session info display (for room metadata)
  inspirationQueueDisplay.setMultiLine(true);
  inspirationQueueDisplay.setReadOnly(true);
  inspirationQueueDisplay.setScrollbarsShown(false);
  inspirationQueueDisplay.setColour(juce::TextEditor::backgroundColourId, juce::Colour(6, 12, 24).withAlpha(0.85f));
  inspirationQueueDisplay.setColour(juce::TextEditor::textColourId, juce::Colour(34, 211, 238).withAlpha(0.9f));
  inspirationQueueDisplay.setFont(juce::Font(juce::FontOptions(11.0f)));
  inspirationQueueDisplay.setText("Session Info\n", false);

  openNotepadButton.onClick = [this] {
    if (currentDisplayedPack.isObject()) openWritingNotepadWithPack(currentDisplayedPack);
  };

  addAndMakeVisible(openNotepadButton);
  addAndMakeVisible(inspirationQueueDisplay);

  // Writing notepad (lyric editor with analysis)
  lyricEditorComponent = std::make_unique<LyricEditorComponent>();

  // forkPackButton removed; forking only available in Search mode per new UX
  savePackButton.onClick = [this] { saveSelectedPack(); };

  // Audio preview setup
  formatManager.registerBasicFormats();
  audioSourcePlayer.setSource(&transportSource);
  deviceManager.initialise(0, 2, nullptr, true);
  deviceManager.addAudioCallback(&audioSourcePlayer);

  playPreviewButton.onClick = [this] {
    if (transportSource.isPlaying())
    {
      transportSource.stop();
      playPreviewButton.setButtonText("Play Preview");
      // cleanup temp file and streaming owner
      if (lastPreviewFile.exists())
      {
        lastPreviewFile.deleteFile();
        lastPreviewFile = juce::File();
      }
      previewStreamOwner.reset();
    }
    else
    {
      transportSource.start();
      playPreviewButton.setButtonText("Stop Preview");
    }
  };

  addToQueueButton.onClick = [this] {
    int row = packList.getSelectedRow();
    if (row >= 0 && row < packItems.size())
      addPackToQueue(packItems.getReference(row));
  };

  // Insert into DAW
  // Note: this calls into the processor which stores the pack; full DAW insertion logic
  // depends on host capabilities and is left as a simple API call here.
  // We need access to processor reference in the editor (available as member `processor`).

  addAndMakeVisible(playPreviewButton);
  addAndMakeVisible(addToQueueButton);
  addAndMakeVisible(inspirationQueueDisplay);
  addAndMakeVisible(*lyricEditorComponent);

  addAndMakeVisible(*packDetailComponent);
  addAndMakeVisible(savePackButton);
  addAndMakeVisible(insertPackButton);

  // Room info labels (hidden until in a room)
  roomInfoLabel.setText("", juce::dontSendNotification);
  roomInfoLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.9f));
  roomInfoLabel.setFont(juce::Font(juce::FontOptions(12.0f).withKerningFactor(0.05f)));
  roomPasswordLabel.setText("", juce::dontSendNotification);
  roomPasswordLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.7f));
  roomPasswordLabel.setFont(juce::Font(juce::FontOptions(11.0f)));

  // Producer/editor detail displays
  producerDetailDisplay.setMultiLine(true);
  producerDetailDisplay.setReadOnly(true);
  producerDetailDisplay.setScrollbarsShown(true);
  producerDetailDisplay.setColour(juce::TextEditor::backgroundColourId, juce::Colour(10, 16, 37).withAlpha(0.62f));
  producerDetailDisplay.setColour(juce::TextEditor::textColourId, juce::Colour(241, 245, 255).withAlpha(0.96f));
  producerDetailDisplay.setFont(juce::Font(juce::FontOptions(11.0f)));

  editorDetailDisplay.setMultiLine(true);
  editorDetailDisplay.setReadOnly(true);
  editorDetailDisplay.setScrollbarsShown(true);
  editorDetailDisplay.setColour(juce::TextEditor::backgroundColourId, juce::Colour(10, 16, 37).withAlpha(0.62f));
  editorDetailDisplay.setColour(juce::TextEditor::textColourId, juce::Colour(241, 245, 255).withAlpha(0.96f));
  editorDetailDisplay.setFont(juce::Font(juce::FontOptions(11.0f)));

  addAndMakeVisible(serverUrlInput);
  addAndMakeVisible(guestButton);
  addAndMakeVisible(signupButton);
  addAndMakeVisible(loginButton);
  addAndMakeVisible(roomIdInput);
  addAndMakeVisible(codeInput);
  addAndMakeVisible(passwordInput);
  addAndMakeVisible(joinButton);
  addAndMakeVisible(createRoomButton);
  addAndMakeVisible(viewActiveRoomsButton);
  addAndMakeVisible(refreshButton);
  addAndMakeVisible(downloadButton);
  addAndMakeVisible(statusLabel);
  addAndMakeVisible(tokenLabel);
  addAndMakeVisible(syncStatusLabel);
  addAndMakeVisible(authStatusLabel);
  addAndMakeVisible(roleStatusLabel);
  addAndMakeVisible(roleBadgeLabel);
  addAndMakeVisible(fileList);
  addAndMakeVisible(packList);
  addAndMakeVisible(generatePackButton);
  addAndMakeVisible(remixPackButton);
  addAndMakeVisible(roomInfoLabel);
  addAndMakeVisible(roomPasswordLabel);
  addAndMakeVisible(producerDetailDisplay);
  addAndMakeVisible(editorDetailDisplay);
  
  // Mode card components (initially hidden)
  addAndMakeVisible(writerLabCard);
  addAndMakeVisible(producerLabCard);
  addAndMakeVisible(editorSuiteCard);
  addAndMakeVisible(updatesCard);
  addAndMakeVisible(searchCard);
  addAndMakeVisible(searchInput);
  addAndMakeVisible(searchGoButton);
  addAndMakeVisible(searchPrevButton);
  addAndMakeVisible(searchNextButton);
  addAndMakeVisible(searchPageLabel);
  searchPrevButton.setColour(juce::TextButton::buttonColourId, juce::Colour(148, 163, 184).withAlpha(0.9f));
  searchNextButton.setColour(juce::TextButton::buttonColourId, juce::Colour(148, 163, 184).withAlpha(0.9f));
  searchPageLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.9f));
  addAndMakeVisible(backButton);
  addAndMakeVisible(modeTitleLabel);
  
  // New filter buttons (3x3 grid)
  auto styleFilterButton = [](juce::TextButton& btn) {
    btn.setColour(juce::TextButton::buttonColourId, juce::Colour(34, 211, 238).withAlpha(0.3f));
    btn.setColour(juce::TextButton::buttonOnColourId, juce::Colour(34, 211, 238).withAlpha(0.9f));
    btn.setColour(juce::TextButton::textColourOffId, juce::Colour(241, 245, 255).withAlpha(0.7f));
    btn.setColour(juce::TextButton::textColourOnId, juce::Colour(241, 245, 255));
  };
  
  styleFilterButton(filterFreshButton);
  styleFilterButton(filterRecentButton);
  styleFilterButton(filterTimelessButton);
  styleFilterButton(filterFunnyButton);
  styleFilterButton(filterDeepButton);
  styleFilterButton(filterDarkButton);
  styleFilterButton(filterTightButton);
  styleFilterButton(filterBalancedButton);
  styleFilterButton(filterWildButton);
  
  // Filter button callbacks
  filterFreshButton.onClick = [this] { onFilterButtonClicked(&filterFreshButton, "timeframe", "fresh"); };
  filterRecentButton.onClick = [this] { onFilterButtonClicked(&filterRecentButton, "timeframe", "recent"); };
  filterTimelessButton.onClick = [this] { onFilterButtonClicked(&filterTimelessButton, "timeframe", "timeless"); };
  filterFunnyButton.onClick = [this] { onFilterButtonClicked(&filterFunnyButton, "tone", "funny"); };
  filterDeepButton.onClick = [this] { onFilterButtonClicked(&filterDeepButton, "tone", "deep"); };
  filterDarkButton.onClick = [this] { onFilterButtonClicked(&filterDarkButton, "tone", "dark"); };
  filterTightButton.onClick = [this] { onFilterButtonClicked(&filterTightButton, "semantic", "tight"); };
  filterBalancedButton.onClick = [this] { onFilterButtonClicked(&filterBalancedButton, "semantic", "balanced"); };
  filterWildButton.onClick = [this] { onFilterButtonClicked(&filterWildButton, "semantic", "wild"); };
  
  addAndMakeVisible(filterFreshButton);
  addAndMakeVisible(filterRecentButton);
  addAndMakeVisible(filterTimelessButton);
  addAndMakeVisible(filterFunnyButton);
  addAndMakeVisible(filterDeepButton);
  addAndMakeVisible(filterDarkButton);
  addAndMakeVisible(filterTightButton);
  addAndMakeVisible(filterBalancedButton);
  addAndMakeVisible(filterWildButton);
  
  // Set initial selected state
  filterFreshButton.setToggleState(true, juce::dontSendNotification);
  filterFunnyButton.setToggleState(true, juce::dontSendNotification);
  filterTightButton.setToggleState(true, juce::dontSendNotification);

  // Restore persisted auth/session state only after all UI components exist
  loadSessionData();

  // push/pull and updates UI are created when entering Updates mode
  updateUIForAuthState();
}

InspireVSTAudioProcessorEditor::~InspireVSTAudioProcessorEditor()
{
  stopSyncPolling();

  // Stop audio and cleanup preview resources
  transportSource.stop();
  transportSource.setSource(nullptr);
  transportReaderSource.reset();

  audioSourcePlayer.setSource(nullptr);
  deviceManager.removeAudioCallback(&audioSourcePlayer);

  // Delete reusable preview temp file if it exists
  if (previewTempFile.exists())
  {
    previewTempFile.deleteFile();
    previewTempFile = juce::File();
  }
  previewStreamOwner.reset();
}

void InspireVSTAudioProcessorEditor::paint(juce::Graphics& g)
{
  // Dark gradient background matching Inspire web app theme
  // Linear gradient: #050512 → #0b1129 → #1a1033
  juce::Colour bgStart(5, 5, 18);
  juce::Colour bgMid(11, 17, 41);
  juce::Colour bgEnd(26, 16, 51);
  
  // Draw gradient background
  for (int y = 0; y < getHeight(); ++y)
  {
    float normalizedY = static_cast<float>(y) / getHeight();
    juce::Colour interpolated = bgStart.interpolatedWith(bgEnd, normalizedY);
    g.setColour(interpolated);
    g.drawHorizontalLine(y, 0.0f, static_cast<float>(getWidth()));
  }
  
  // CENTERED header section with logo
  int logoW = 200;
  int logoX = (getWidth() - logoW) / 2;
  logoBounds = juce::Rectangle<int>(logoX, 8, logoW, 36);
  
  // Draw subtle background on hover (if mouse is over logo)
  auto mousePos = getMouseXYRelative();
  bool isHovering = logoBounds.contains(mousePos);
  if (isHovering)
  {
    g.setColour(juce::Colour(255, 255, 255).withAlpha(0.05f));
    g.fillRoundedRectangle(logoBounds.toFloat(), 4.0f);
  }
  
  g.setColour(juce::Colour(241, 245, 255).withAlpha(0.96f));
  g.setFont(juce::Font(juce::FontOptions(20.0f).withKerningFactor(0.1f)));
  g.drawText("Inspire", logoX, 8, logoW, 28, juce::Justification::centred);
  
  // Subtitle
  g.setColour(juce::Colour(241, 245, 255).withAlpha(0.6f));
  g.setFont(juce::Font(juce::FontOptions(10.0f)));
  g.drawText("Collaboration Hub", logoX, 28, logoW, 16, juce::Justification::centred);
  
  // Menu icon hint
  if (isHovering)
  {
    g.setColour(juce::Colour(34, 211, 238).withAlpha(0.8f));
    fontAudio->drawAt(g, fontaudio::CaretDown, 12.0f, juce::Colour(34, 211, 238).withAlpha(0.9f), logoX + logoW - 18, 16);
  }

  if (!roleStatusBarBounds.isEmpty())
  {
    const auto accent = roleAccentColour();
    g.setColour(accent.withAlpha(0.18f));
    g.fillRoundedRectangle(roleStatusBarBounds.toFloat(), 8.0f);
    g.setColour(accent.withAlpha(0.45f));
    g.drawRoundedRectangle(roleStatusBarBounds.toFloat(), 8.0f, 1.0f);
  }

  if (roleBadgeLabel.isVisible())
  {
    const auto badgeBounds = roleBadgeLabel.getBounds().toFloat();
    const auto accent = roleAccentColour();
    g.setColour(accent.withAlpha(0.20f));
    g.fillRoundedRectangle(badgeBounds, 10.0f);
    g.setColour(accent.withAlpha(0.55f));
    g.drawRoundedRectangle(badgeBounds, 10.0f, 1.0f);
  }

  // Draw FontAudio icons for action buttons to avoid missing/unsupported symbols
  const auto iconColour = juce::Colour(241, 245, 255).withAlpha(0.95f);
  if (generatePackButton.isVisible())
  {
    auto b = generatePackButton.getBounds();
    fontAudio->drawAt(g, fontaudio::Play, 14.0f, iconColour, b.getX() + 8, b.getY() + (b.getHeight() - 14) / 2);
  }
  if (savePackButton.isVisible())
  {
    auto b = savePackButton.getBounds();
    fontAudio->drawAt(g, fontaudio::Save, 14.0f, iconColour, b.getX() + 8, b.getY() + (b.getHeight() - 14) / 2);
  }
  if (openNotepadButton.isVisible())
  {
    auto b = openNotepadButton.getBounds();
    fontAudio->drawAt(g, fontaudio::Open, 14.0f, iconColour, b.getX() + 8, b.getY() + (b.getHeight() - 14) / 2);
  }
  if (backButton.isVisible())
  {
    auto b = backButton.getBounds();
    fontAudio->drawAt(g, fontaudio::CaretLeft, 13.0f, iconColour, b.getX() + 8, b.getY() + (b.getHeight() - 13) / 2);
  }
  
  // Filter section visual separation is provided by layout grouping
  // The 3x3 button grid naturally groups filters by category
  
  if (!sessionCardBounds.isEmpty())
    paintSessionInfoCard(g, sessionCardBounds.getX(), sessionCardBounds.getY(), sessionCardBounds.getWidth(), sessionCardBounds.getHeight());
}

void InspireVSTAudioProcessorEditor::resized()
{
  const int padding = 14;
  const int lineHeight = 32;
  const int gap = 8;
  const int buttonWidth = 110;
  const int headerHeight = 52;  // Increased for top-left bar
  const int iconSize = 28;  // Size for top-right action icons

  // TOP-LEFT: Back button and Mode title (combined as one visual bar)
  const int backW = 120;  // Wider to contain back + mode title info
  backButton.setBounds(padding, 8, backW, 36);
  modeTitleLabel.setBounds(padding + backW + 8, 8, 150, 36);
  
  // TOP-RIGHT: Action icons (Generate, Save, Notepad)
  const int iconPadding = 8;
  int iconX = getWidth() - padding - (iconSize * 3 + gap * 2);
  generatePackButton.setBounds(iconX, 8 + (36 - iconSize) / 2, iconSize, iconSize);
  savePackButton.setBounds(iconX + iconSize + gap, 8 + (36 - iconSize) / 2, iconSize, iconSize);
  openNotepadButton.setBounds(iconX + (iconSize + gap) * 2, 8 + (36 - iconSize) / 2, iconSize, iconSize);

  roleBadgeLabel.setBounds(getWidth() - padding - 110, 14, 110, 22);
  
  // Make these top-right buttons visible in creative modes
  generatePackButton.setVisible(false);
  savePackButton.setVisible(false);
  openNotepadButton.setVisible(false);
  
  // Hide remix button everywhere (replaced by separate remix modes)
  remixPackButton.setVisible(false);
  int yPos = headerHeight + padding;

  if (!isAuthenticated)
  {
    // Server URL field (full width)
    serverUrlInput.setBounds(padding, yPos, getWidth() - padding * 2, lineHeight);
    yPos += lineHeight + gap;

    // Auth + role status bar
    const int statusBarW = getWidth() - padding * 2;
    roleStatusBarBounds = juce::Rectangle<int>(padding, yPos, statusBarW, 22);
    const int halfW = (statusBarW - gap) / 2;
    authStatusLabel.setBounds(padding + 10, yPos, halfW - 10, 22);
    roleStatusLabel.setBounds(padding + halfW + gap, yPos, halfW - 10, 22);
    yPos += 24;

    // Auth buttons (3 buttons side by side)
    int btnWidth = (getWidth() - padding * 4 - gap * 2) / 3;
    guestButton.setBounds(padding, yPos, btnWidth, lineHeight);
    signupButton.setBounds(padding * 2 + btnWidth + gap, yPos, btnWidth, lineHeight);
    loginButton.setBounds(padding * 3 + btnWidth * 2 + gap * 2, yPos, btnWidth, lineHeight);
    yPos += lineHeight + gap + 4;
    
    // Hide room buttons when not authenticated
    joinButton.setVisible(false);
    createRoomButton.setVisible(false);
  }
  else
  {
    // Authenticated: show mode cards and creative UI (room is optional)
    const int statusBarW = getWidth() - padding * 2;
    roleStatusBarBounds = juce::Rectangle<int>(padding, yPos, statusBarW, 22);
    const int halfW = (statusBarW - gap) / 2;
    authStatusLabel.setBounds(padding + 10, yPos, halfW - 10, 22);
    roleStatusLabel.setBounds(padding + halfW + gap, yPos, halfW - 10, 22);
    yPos += 24;

    if (!inRoom && selectedMode.isEmpty())
    {
      if (isMasterRole())
      {
        // Master can create and browse rooms in addition to joining.
        roomIdInput.setBounds(padding, yPos, getWidth() - padding * 2, lineHeight);
        yPos += lineHeight + gap;

        int halfW = (getWidth() - padding * 2 - gap) / 2;
        codeInput.setBounds(padding, yPos, halfW, lineHeight);
        passwordInput.setBounds(padding + halfW + gap, yPos, halfW, lineHeight);
        yPos += lineHeight + gap;

        int roomBtnW = (getWidth() - padding * 2 - gap * 2) / 3;
        joinButton.setBounds(padding, yPos, roomBtnW, lineHeight);
        createRoomButton.setBounds(padding + roomBtnW + gap, yPos, roomBtnW, lineHeight);
        viewActiveRoomsButton.setBounds(padding + (roomBtnW + gap) * 2, yPos, roomBtnW, lineHeight);
        yPos += lineHeight + gap + 8;
      }
      else
      {
        // Relay/Create still need room code + password + attach action.
        roomIdInput.setBounds(0, 0, 0, 0);
        int halfW = (getWidth() - padding * 2 - gap) / 2;
        codeInput.setBounds(padding, yPos, halfW, lineHeight);
        passwordInput.setBounds(padding + halfW + gap, yPos, halfW, lineHeight);
        yPos += lineHeight + gap;

        joinButton.setBounds(padding, yPos, getWidth() - padding * 2, lineHeight);
        yPos += lineHeight + gap + 8;
      }
    }

    if (selectedMode.isEmpty())
    {
      const int cardHeight = 60;
      const int cardGap = 10;
      
      // Mode selection cards in a 2x2 grid
      int cardWidth = (getWidth() - padding * 2 - cardGap) / 2;
      
      // Row 1: Writer Lab, Producer Lab
      writerLabCard.setBounds(padding, yPos, cardWidth, cardHeight);
      producerLabCard.setBounds(padding + cardWidth + cardGap, yPos, cardWidth, cardHeight);
      yPos += cardHeight + cardGap;
      
      // Row 2: Editor Suite, Updates
      editorSuiteCard.setBounds(padding, yPos, cardWidth, cardHeight);
      updatesCard.setBounds(padding + cardWidth + cardGap, yPos, cardWidth, cardHeight);
      yPos += cardHeight + cardGap;

      // Search card (full width) as the fifth mode
      searchCard.setBounds(padding, yPos, getWidth() - padding * 2, cardHeight);
      yPos += cardHeight + cardGap + 10;
    }

    const bool inCreativeModeLayout = (selectedMode == "writer" || selectedMode == "producer" || selectedMode == "editor");

    // Room info labels are not shown above creative modes (session card owns this info)
    roomInfoLabel.setVisible(inRoom && !inCreativeModeLayout);
    roomPasswordLabel.setVisible(inRoom && !inCreativeModeLayout);
    int roomInfoHeight = 0;
    if (inRoom && !inCreativeModeLayout)
    {
      roomInfoLabel.setBounds(padding, yPos, getWidth() - padding * 2, 20);
      roomPasswordLabel.setBounds(padding, yPos + 20, getWidth() - padding * 2, 18);
      roomInfoHeight = 40;
      yPos += roomInfoHeight + gap;
    }

    // Push/Pull buttons: only lay out when in Updates mode AND in a room
    if (inRoom && selectedMode == "updates")
    {
      int pushPullBtnWidth = (getWidth() - padding * 2 - gap * 2) / 3;
      pushTrackButton.setVisible(true);
      pullTrackButton.setVisible(true);
      attachArtifactButton.setVisible(true);
      pushTrackButton.setBounds(padding, yPos, pushPullBtnWidth, lineHeight);
      pullTrackButton.setBounds(padding + pushPullBtnWidth + gap, yPos, pushPullBtnWidth, lineHeight);
      attachArtifactButton.setBounds(padding + (pushPullBtnWidth + gap) * 2, yPos, pushPullBtnWidth, lineHeight);
      yPos += lineHeight + gap + 8;
    }
    else
    {
      pushTrackButton.setVisible(false);
      pullTrackButton.setVisible(false);
      attachArtifactButton.setVisible(false);
    }
    
    // Old filter control is deprecated - replaced by new 3x3 grid in InitialView
    // Always hide to prevent duplicate UI
    bool showFilters = false;
    const int filterHeight = showFilters ? 86 : 0;
    if (showFilters && filterControl)
    {
      filterControl->setVisible(true);
      filterControl->setBounds(padding, yPos, getWidth() - padding * 2, filterHeight);
      yPos += filterHeight + 8;
    }
    else if (filterControl)
    {
      filterControl->setVisible(false);
    }
    
    // Push log / Pack list section
    pushLogLabel.setBounds(padding, yPos, getWidth() - padding * 2, 20);
    yPos += 22;

    int logHeight = getHeight() - yPos - padding;
    if (logHeight > 50)
    {
        if (selectedMode == "writer" || selectedMode == "producer" || selectedMode == "editor")
        {
          // NEW SIMPLIFIED LAYOUT: InitialView or GeneratedView
          
          if (currentUIState == UIState::InitialView)
          {
            // InitialView: Only Generate button + 9 filter buttons
            
            // Center the content
            const int contentWidth = 400;
            const int contentX = (getWidth() - contentWidth) / 2;
            
            // Generate Pack button at top
            const int genBtnH = 48;
            generatePackButton.setBounds(contentX, yPos, contentWidth, genBtnH);
            generatePackButton.setVisible(true);
            yPos += genBtnH + 16;
            
            // Filter setup
            const int btnW = (contentWidth - 16) / 3;
            const int btnH = 40;
            const int btnGap = 8;
            const int iconSize = 12;
            
            // Row 1: Timeframe buttons
            timeframeIconBounds = juce::Rectangle<int>(contentX - 18, yPos, iconSize, iconSize);
            filterFreshButton.setBounds(contentX, yPos, btnW, btnH);
            filterRecentButton.setBounds(contentX + btnW + btnGap, yPos, btnW, btnH);
            filterTimelessButton.setBounds(contentX + (btnW + btnGap) * 2, yPos, btnW, btnH);
            filterFreshButton.setVisible(true);
            filterRecentButton.setVisible(true);
            filterTimelessButton.setVisible(true);
            yPos += btnH + 8;
            
            // Row 2: Tone buttons
            toneIconBounds = juce::Rectangle<int>(contentX - 18, yPos, iconSize, iconSize);
            filterFunnyButton.setBounds(contentX, yPos, btnW, btnH);
            filterDeepButton.setBounds(contentX + btnW + btnGap, yPos, btnW, btnH);
            filterDarkButton.setBounds(contentX + (btnW + btnGap) * 2, yPos, btnW, btnH);
            filterFunnyButton.setVisible(true);
            filterDeepButton.setVisible(true);
            filterDarkButton.setVisible(true);
            yPos += btnH + 8;
            
            // Row 3: Semantic buttons
            semanticIconBounds = juce::Rectangle<int>(contentX - 18, yPos, iconSize, iconSize);
            filterTightButton.setBounds(contentX, yPos, btnW, btnH);
            filterBalancedButton.setBounds(contentX + btnW + btnGap, yPos, btnW, btnH);
            filterWildButton.setBounds(contentX + (btnW + btnGap) * 2, yPos, btnW, btnH);
            filterTightButton.setVisible(true);
            filterBalancedButton.setVisible(true);
            filterWildButton.setVisible(true);
            
            // Hide all other components
            packList.setVisible(false);
            packDetailComponent->setVisible(false);
            lyricEditorComponent->setVisible(false);
            inspirationQueueList.setVisible(false);
            savePackButton.setVisible(false);
            openNotepadButton.setVisible(false);
            
            for (auto* btn : packCardButtons)
              btn->setVisible(false);
          }
          else  // currentUIState == UIState::GeneratedView
          {
            // GeneratedView: Pack Cards (left) + Inspiration Queue (right)
            
            // Hide filter buttons
            filterFreshButton.setVisible(false);
            filterRecentButton.setVisible(false);
            filterTimelessButton.setVisible(false);
            filterFunnyButton.setVisible(false);
            filterDeepButton.setVisible(false);
            filterDarkButton.setVisible(false);
            filterTightButton.setVisible(false);
            filterBalancedButton.setVisible(false);
            filterWildButton.setVisible(false);
            
            // Split view: left for pack cards, right for inspiration queue
            const int splitX = getWidth() / 2;
            const int contentH = getHeight() - yPos - padding;
            
            // LEFT: Pack card buttons (vertical list)
            const int cardH = 60;
            const int cardGap = 8;
            int cardY = yPos;
            for (int i = 0; i < packCardButtons.size(); ++i)
            {
              auto* btn = packCardButtons[i];
              btn->setBounds(padding, cardY, splitX - padding * 2, cardH);
              btn->setVisible(true);
              cardY += cardH + cardGap;
            }
            
            // RIGHT: Inspiration Queue
            inspirationQueueList.setBounds(splitX + padding, yPos, getWidth() - splitX - padding * 2, contentH);
            inspirationQueueList.setVisible(true);
            
            // Show action buttons
            generatePackButton.setVisible(true);
            savePackButton.setVisible(true);
            openNotepadButton.setVisible(true);
            
            // If a pack is selected, show its detail
            if (currentDisplayedPack.isObject())
            {
              // Show pack detail on the left replacing pack cards with detail view
              packDetailComponent->setBounds(padding, yPos, splitX - padding * 2, contentH);
              packDetailComponent->setVisible(true);
              
              // Hide pack card buttons when showing detail
              for (auto* btn : packCardButtons)
                btn->setVisible(false);
            }
            else
            {
              packDetailComponent->setVisible(false);
            }
            
            packList.setVisible(false);
            lyricEditorComponent->setVisible(false);
          }
          
          sessionCardBounds = juce::Rectangle<int>();
          pushLogDisplay.setVisible(false);
          producerDetailDisplay.setVisible(false);
          editorDetailDisplay.setVisible(false);
        }
        else if (selectedMode == "search")
        {
          sessionCardBounds = juce::Rectangle<int>();
          roomCodeCopyBounds = juce::Rectangle<int>();
          passwordCopyBounds = juce::Rectangle<int>();
          leaveRoomBounds = juce::Rectangle<int>();
          const int searchH = 32;
          const int btnW = 80;
          const int pagerW = 180;
          searchInput.setBounds(padding, yPos, getWidth() - padding * 2 - btnW - pagerW - 16, searchH);
          searchGoButton.setBounds(searchInput.getRight() + 8, yPos, btnW, searchH);
          searchPrevButton.setBounds(searchGoButton.getRight() + 8, yPos, 44, searchH);
          searchPageLabel.setBounds(searchPrevButton.getRight() + 6, yPos, 88, searchH);
          searchNextButton.setBounds(searchPageLabel.getRight() + 6, yPos, 44, searchH);
          yPos += searchH + gap;
          packList.setBounds(padding, yPos, getWidth() - padding * 2, logHeight - searchH - 8);
          producerDetailDisplay.setVisible(false);
          editorDetailDisplay.setVisible(false);
          pushLogDisplay.setVisible(false);
        }
        else if (selectedMode == "updates")
        {
          sessionCardBounds = juce::Rectangle<int>();
          roomCodeCopyBounds = juce::Rectangle<int>();
          passwordCopyBounds = juce::Rectangle<int>();
          leaveRoomBounds = juce::Rectangle<int>();
          // Updates mode: show push log if in room, or message if not
          if (inRoom)
          {
            // Updates mode layout: transfer receipt + instances + activity log
            const int gap = 8;
            const int receiptHeight = 78;
            const int selectorHeight = 24;
            
            sourceInstanceLabel.setBounds(padding, yPos, 56, selectorHeight);
            sourceInstanceLabel.setVisible(true);
            sourceInstanceCombo.setBounds(padding + 60, yPos, getWidth() - padding * 2 - 60, selectorHeight);
            sourceInstanceCombo.setVisible(true);
            yPos += selectorHeight + 4;

            destinationInstanceLabel.setBounds(padding, yPos, 80, selectorHeight);
            destinationInstanceLabel.setVisible(true);
            destinationInstanceValue.setBounds(padding + 84, yPos, getWidth() - padding * 2 - 84, selectorHeight);
            destinationInstanceValue.setVisible(true);
            yPos += selectorHeight + gap;

            // Sync status indicator at top
            syncStatusIndicator.setBounds(padding, yPos, getWidth() - padding * 2, 20);
            syncStatusIndicator.setVisible(true);
            yPos += 24;

            const int recordReadyHeight = 64;
            recordReadyLabel.setBounds(padding, yPos, getWidth() - padding * 2, 18);
            recordReadyLabel.setVisible(true);
            yPos += 20;
            recordReadyDisplay.setBounds(padding, yPos, getWidth() - padding * 2, recordReadyHeight);
            recordReadyDisplay.setVisible(true);
            yPos += recordReadyHeight + gap;

            // Last transfer receipt panel
            lastTransferLabel.setBounds(padding, yPos, getWidth() - padding * 2, 18);
            lastTransferLabel.setVisible(true);
            yPos += 20;
            lastTransferDisplay.setBounds(padding, yPos, getWidth() - padding * 2, receiptHeight);
            lastTransferDisplay.setVisible(true);
            yPos += receiptHeight + gap;
            
            // Instances list section (top half)
            instancesListLabel.setBounds(padding, yPos, getWidth() - padding * 2, 18);
            instancesListLabel.setVisible(true);
            yPos += 20;
            
            const int remainingHeight = getHeight() - yPos - padding;
            const int instancesHeight = juce::jmax(80, (remainingHeight - 24) / 2);
            instancesDisplay.setBounds(padding, yPos, getWidth() - padding * 2, instancesHeight);
            instancesDisplay.setVisible(true);
            yPos += instancesHeight + gap;
            
            // Push log section (bottom half)
            pushLogLabel.setBounds(padding, yPos, getWidth() - padding * 2, 18);
            pushLogLabel.setVisible(true);
            yPos += 20;
            
            const int pushLogHeight = logHeight - (yPos - (logHeight + padding));
            pushLogDisplay.setBounds(padding, yPos, getWidth() - padding * 2, pushLogHeight);
            pushLogDisplay.setVisible(true);
          }
          else
          {
            // Not in a room - hide instance list and show invitational message
            syncStatusIndicator.setVisible(false);
            sourceInstanceLabel.setVisible(false);
            sourceInstanceCombo.setVisible(false);
            destinationInstanceLabel.setVisible(false);
            destinationInstanceValue.setVisible(false);
            lastTransferLabel.setVisible(false);
            lastTransferDisplay.setVisible(false);
            recordReadyLabel.setVisible(false);
            recordReadyDisplay.setVisible(false);
            instancesListLabel.setVisible(false);
            instancesDisplay.setVisible(false);
            pushLogLabel.setVisible(false);
            
            pushLogDisplay.setText(
              "Join or create a room to collaborate with others!\n\n"
              "• Tap 'Guest', 'Sign Up', or 'Log In' at the top\n"
              "• Then click back to room selection\n"
              "• Create a new room or join with an existing code\n\n"
              "Once in a room, you'll see live updates from collaborators here.",
              false
            );
            pushLogDisplay.setBounds(padding, yPos, getWidth() - padding * 2, logHeight);
            pushLogDisplay.setVisible(true);
          }
          producerDetailDisplay.setVisible(false);
          editorDetailDisplay.setVisible(false);
          packList.setVisible(false);
          packDetailComponent->setVisible(false);
        }
        else
        {
          sessionCardBounds = juce::Rectangle<int>();
          roomCodeCopyBounds = juce::Rectangle<int>();
          passwordCopyBounds = juce::Rectangle<int>();
          leaveRoomBounds = juce::Rectangle<int>();
          recordReadyLabel.setVisible(false);
          recordReadyDisplay.setVisible(false);
          // Other modes
          pushLogDisplay.setVisible(false);
          producerDetailDisplay.setVisible(false);
          editorDetailDisplay.setVisible(false);
          packList.setVisible(false);
          packDetailComponent->setVisible(false);
        }
    }

  }
}
  

void InspireVSTAudioProcessorEditor::mouseDown(const juce::MouseEvent& event)
{
  // Check if logo was clicked
  if (logoBounds.contains(event.getPosition()))
  {
    showLogoMenu();
    return;
  }
  
  // Check if session card is visible and handle clicks
  if (isAuthenticated && inRoom && (selectedMode == "writer" || selectedMode == "producer" || selectedMode == "editor"))
  {
    handleSessionCardClick(event.getPosition());
  }
}

void InspireVSTAudioProcessorEditor::mouseMove(const juce::MouseEvent& event)
{
  // Repaint if hovering over logo to show hover effect
  static bool wasHoveringLastTime = false;
  bool isHoveringNow = logoBounds.contains(event.getPosition());
  
  if (isHoveringNow != wasHoveringLastTime)
  {
    repaint(logoBounds.getX() - 5, logoBounds.getY() - 5, logoBounds.getWidth() + 10, logoBounds.getHeight() + 10);
    wasHoveringLastTime = isHoveringNow;
  }
}

void InspireVSTAudioProcessorEditor::refreshUpdatesDisplay()
{
  if (!pushLogDisplay.isShowing())
    return;

  juce::String txt;
  if (groupedTimelineText.isNotEmpty())
  {
    txt += groupedTimelineText;
    txt += "\n----------------------------------------\n";
  }

  for (auto& v : updatesList)
  {
    if (v.isObject())
    {
      juce::DynamicObject* o = v.getDynamicObject();
      juce::String t = o->getProperty("timestamp").toString();
      juce::String src = o->getProperty("source").toString();
      juce::String inst = o->getProperty("instance").toString();
      juce::String version = o->getProperty("version").toString();
      juce::String beat = o->getProperty("beat").toString();
      juce::String msg = o->getProperty("message").toString();
      txt += "[" + t + "] [" + (src.isEmpty() ? juce::String("sync") : src) + "] ";
      txt += (inst.isEmpty() ? juce::String("unknown") : inst);
      if (version.isNotEmpty())
        txt += " v" + version;
      if (beat.isNotEmpty())
        txt += " beat:" + beat;
      txt += " — " + msg + "\n";
    }
  }

  pushLogDisplay.setText(txt, false);
}

void InspireVSTAudioProcessorEditor::appendUpdateEvent(const juce::String& source,
                                                       const juce::String& actor,
                                                       int version,
                                                       int beat,
                                                       const juce::String& detail)
{
  auto now = juce::Time::getCurrentTime();
  juce::DynamicObject::Ptr entry = new juce::DynamicObject();
  entry->setProperty("timestamp", now.toString(true, true));
  entry->setProperty("source", source);
  entry->setProperty("instance", actor);
  if (version > 0)
    entry->setProperty("version", juce::String(version));
  if (beat > 0)
    entry->setProperty("beat", juce::String(beat));
  entry->setProperty("message", detail);
  updatesList.insert(0, juce::var(entry.get()));
  if (updatesList.size() > 250)
    updatesList.removeLast();
  if (selectedMode == "updates")
    refreshUpdatesDisplay();
}

void InspireVSTAudioProcessorEditor::paintSessionInfoCard(juce::Graphics& g, int x, int y, int width, int height)
{
  // Session info card background with subtle border
  juce::Colour cardBg = juce::Colour(20, 25, 45);
  g.setColour(cardBg);
  g.fillRoundedRectangle(static_cast<float>(x), static_cast<float>(y), static_cast<float>(width), static_cast<float>(height), 6.0f);
  
  // Border
  g.setColour(juce::Colour(34, 211, 238).withAlpha(0.4f));
  g.drawRoundedRectangle(static_cast<float>(x), static_cast<float>(y), static_cast<float>(width), static_cast<float>(height), 6.0f, 1.5f);
  
  const int padding = 12;
  const int buttonSize = 22;
  const int buttonGap = 4;
  int yPos = y + padding;
  
  // Title
  g.setColour(juce::Colour(34, 211, 238));
  g.setFont(juce::Font(juce::FontOptions(12.0f).withKerningFactor(0.05f)).boldened());
  g.drawText("COLLABORATION SESSION", x + padding, yPos, width - padding * 2, 18, juce::Justification::centredLeft);
  yPos += 20;
  
  // Room info and session details
  g.setColour(juce::Colour(241, 245, 255).withAlpha(0.9f));
  g.setFont(juce::Font(juce::FontOptions(10.0f)));
  
  // Extract room code from roomInfoLabel
  juce::String roomCode = roomInfoLabel.getText();
  g.drawText("Room: " + roomCode, x + padding, yPos, width - padding * 2 - buttonSize - buttonGap, 14, juce::Justification::topLeft);
  
  // Copy button for room code (right side)
  roomCodeCopyBounds = juce::Rectangle<int>(x + width - padding - buttonSize, yPos, buttonSize, buttonSize);
  int64_t nowMs = juce::Time::currentTimeMillis();
  bool showRoomCodeCopyFeedback = (lastCopiedButton == 0) && ((nowMs - lastCopyFeedbackTimeMs) < 1500);
  g.setColour(showRoomCodeCopyFeedback ? juce::Colour(120, 204, 120).withAlpha(0.8f) : juce::Colour(34, 211, 238).withAlpha(0.6f));
  g.fillRoundedRectangle(static_cast<float>(roomCodeCopyBounds.getX()), static_cast<float>(roomCodeCopyBounds.getY()),
                         static_cast<float>(roomCodeCopyBounds.getWidth()), static_cast<float>(roomCodeCopyBounds.getHeight()), 3.0f);
  g.setColour(juce::Colour(241, 245, 255));
  g.setFont(juce::Font(juce::FontOptions(10.0f)));
  g.drawText(showRoomCodeCopyFeedback ? "OK" : "CP", roomCodeCopyBounds, juce::Justification::centred);
  yPos += 15;
  
  // Password
  g.setColour(juce::Colour(241, 245, 255).withAlpha(0.9f));
  g.setFont(juce::Font(juce::FontOptions(10.0f)));
  juce::String password = roomPasswordLabel.getText();
  g.drawText("Pass: " + password, x + padding, yPos, width - padding * 2 - buttonSize - buttonGap, 14, juce::Justification::topLeft);
  
  // Copy button for password (right side)
  passwordCopyBounds = juce::Rectangle<int>(x + width - padding - buttonSize, yPos, buttonSize, buttonSize);
  bool showPasswordCopyFeedback = (lastCopiedButton == 1) && ((nowMs - lastCopyFeedbackTimeMs) < 1500);
  g.setColour(showPasswordCopyFeedback ? juce::Colour(120, 204, 120).withAlpha(0.8f) : juce::Colour(34, 211, 238).withAlpha(0.6f));
  g.fillRoundedRectangle(static_cast<float>(passwordCopyBounds.getX()), static_cast<float>(passwordCopyBounds.getY()),
                         static_cast<float>(passwordCopyBounds.getWidth()), static_cast<float>(passwordCopyBounds.getHeight()), 3.0f);
  g.setColour(juce::Colour(241, 245, 255));
  g.setFont(juce::Font(juce::FontOptions(10.0f)));
  g.drawText(showPasswordCopyFeedback ? "OK" : "CP", passwordCopyBounds, juce::Justification::centred);
  yPos += 15;
  
  // Auth status
  g.setColour(juce::Colour(241, 245, 255).withAlpha(0.75f));
  g.setFont(juce::Font(juce::FontOptions(10.0f)));
  g.drawText("Auth: " + authStatus, x + padding, yPos, width - padding * 2, 14, juce::Justification::topLeft);
  yPos += 15;
  
  // Calculate time remaining
  int64_t currentTimeMs = juce::Time::currentTimeMillis();
  int64_t elapsedMs = currentTimeMs - sessionStartTimeMs;
  int64_t remainingMs = juce::jmax(0LL, sessionDurationMs - elapsedMs);
  int remainingMins = static_cast<int>(remainingMs / 60000);
  
  // Show in red if expired or < 10 mins, green otherwise
  if (remainingMins == 0)
    g.setColour(juce::Colour(239, 68, 68)); // Bright red for expired
  else if (remainingMins < 10)
    g.setColour(juce::Colour(236, 72, 153)); // Pink for low time
  else
    g.setColour(juce::Colour(120, 204, 120)); // Green for plenty of time
    
  juce::String timeText = remainingMins == 0 ? "Time Left: 0 mins (EXPIRED)" : "Time Left: " + juce::String(remainingMins) + " mins";
  g.drawText(timeText, x + padding, yPos, width - padding * 2, 14, juce::Justification::topLeft);
  yPos += 15;
  
  // Plugin instance ID
  g.setColour(juce::Colour(241, 245, 255).withAlpha(0.75f));
  g.setFont(juce::Font(juce::FontOptions(10.0f)));
  g.drawText("Instance: " + pluginInstanceID, x + padding, yPos, width - padding * 2, 14, juce::Justification::topLeft);
  yPos += 18;
  
  // Leave Room button (bottom of card)
  leaveRoomBounds = juce::Rectangle<int>(x + padding, yPos, width - padding * 2, 24);
  g.setColour(juce::Colour(236, 72, 153).withAlpha(0.7f));
  g.fillRoundedRectangle(static_cast<float>(leaveRoomBounds.getX()), static_cast<float>(leaveRoomBounds.getY()),
                         static_cast<float>(leaveRoomBounds.getWidth()), static_cast<float>(leaveRoomBounds.getHeight()), 4.0f);
  g.setColour(juce::Colour(241, 245, 255));
  g.setFont(juce::Font(juce::FontOptions(11.0f)).boldened());
  g.drawText("Leave Room", leaveRoomBounds, juce::Justification::centred);
}

void InspireVSTAudioProcessorEditor::handleSessionCardClick(juce::Point<int> pos)
{
  auto valueAfterColon = [](const juce::String& text)
  {
    const int idx = text.indexOfChar(':');
    return idx >= 0 ? text.substring(idx + 1).trim() : text;
  };

  // Check copy buttons
  if (roomCodeCopyBounds.contains(pos))
  {
    juce::String roomCode = valueAfterColon(roomInfoLabel.getText());
    copyToClipboard(roomCode);
    lastCopiedButton = 0;
    lastCopyFeedbackTimeMs = juce::Time::currentTimeMillis();
    repaint();
    return;
  }
  
  if (passwordCopyBounds.contains(pos))
  {
    juce::String password = valueAfterColon(roomPasswordLabel.getText());
    copyToClipboard(password);
    lastCopiedButton = 1;
    lastCopyFeedbackTimeMs = juce::Time::currentTimeMillis();
    repaint();
    return;
  }
  
  // Check leave room button
  if (leaveRoomBounds.contains(pos))
  {
    leaveRoom();
    return;
  }
}

void InspireVSTAudioProcessorEditor::copyToClipboard(const juce::String& text)
{
  juce::SystemClipboard::copyTextToClipboard(text);
}

void InspireVSTAudioProcessorEditor::leaveRoom()
{
  stopWebSocketSync();

  // Clear room state
  inRoom = false;
  currentSyncRoomCode.clear();
  codeInput.clear();
  roomIdInput.clear();
  masterInstanceId.clear();
  roleAttached = false;
  roleLockedByMasterRequirement = false;
  roleLockReason.clear();
  activeInstances.clear();
  refreshTransferSelectionOptions();
  roomInfoLabel.setText("", juce::NotificationType::dontSendNotification);
  roomPasswordLabel.setText("", juce::NotificationType::dontSendNotification);
  selectedMode = "";
  
  // Persist session change
  saveSessionData();
  
  addErrorLog("Left collaboration room");
  updateUIForAuthState();
}

void InspireVSTAudioProcessorEditor::logout()
{
  stopWebSocketSync();

  // Clear all auth state
  isAuthenticated = false;
  isGuest = false;
  sessionToken = "";
  authUsername = "";
  pendingAuthBridgeId = "";
  pendingAuthBridgeStartedAtMs = 0;
  lastAuthBridgePollAtMs = 0;
  authBridgePollInFlight = false;
  lastServerTimeMs = 0;
  sessionStartTimeMs = juce::Time::currentTimeMillis();  // Reset session start time
  selectedMode = "";
  currentSyncRoomCode.clear();
  codeInput.clear();
  roomIdInput.clear();
  masterInstanceId.clear();
  roleAttached = false;
  roleLockedByMasterRequirement = false;
  roleLockReason.clear();
  activeInstances.clear();
  refreshTransferSelectionOptions();
  
  // Clear room state if in room
  if (inRoom)
  {
    inRoom = false;
    roomInfoLabel.setText("", juce::NotificationType::dontSendNotification);
    roomPasswordLabel.setText("", juce::NotificationType::dontSendNotification);
  }
  
  // Clear session data
  saveSessionData();
  
  addErrorLog("Logged out");
  setStatus("Logged out. Please sign in again.");
  updateUIForAuthState();
}

void InspireVSTAudioProcessorEditor::showSessionInfoPopup()
{
  // Build session info message
  juce::String info = "COLLABORATION SESSION INFO\n\n";
  info << "Room: " << roomInfoLabel.getText() << "\n";
  info << "Code: " << codeInput.getText() << "\n";
  
  juce::String password = roomPasswordLabel.getText().fromFirstOccurrenceOf(": ", false, false);
  if (password.isNotEmpty())
    info << "Password: " << password << "\n";
  
  info << "Auth: " << (isGuest ? "Guest" : "User") << "\n";
  
  // Calculate time left for guest sessions
  if (isGuest && lastServerTimeMs > 0)
  {
    juce::int64 now = juce::Time::currentTimeMillis();
    juce::int64 elapsed = (now - lastServerTimeMs) / 1000; // seconds
    juce::int64 remaining = 900 - elapsed; // 15 mins = 900 seconds
    if (remaining > 0)
    {
      int mins = static_cast<int>(remaining / 60);
      info << "Time Left: " << juce::String(mins) << " mins\n";
    }
    else
    {
      info << "Time Left: Expired\n";
    }
  }
  else
  {
    info << "Time Left: Unlimited\n";
  }
  
  info << "\nPlugin ID: " << juce::String::toHexString((juce::pointer_sized_int)&processor).substring(0, 8) << "\n";
  
  juce::AlertWindow::showMessageBoxAsync(
    juce::MessageBoxIconType::InfoIcon,
    "Session Information",
    info,
    "Close"
  );
}

void InspireVSTAudioProcessorEditor::showLogoMenu()
{
  juce::PopupMenu menu;
  
  // Build menu based on current state
  if (isAuthenticated)
  {
    menu.addItem(1, "User: " + (authUsername.isEmpty() ? (isGuest ? "Guest" : "Authenticated") : authUsername), false, false);
    menu.addSeparator();
    
    if (inRoom)
    {
      menu.addItem(8, "Session Info", true, false);  // New Session Info option
      menu.addItem(2, "Leave Room", true, false);
    }
    
    menu.addItem(3, "Logout", true, false);
    menu.addSeparator();
  }
  
  // Orientation options
  menu.addSectionHeader("Layout");
  menu.addItem(4, "Portrait Mode", true, getWidth() < getHeight());
  menu.addItem(5, "Landscape Mode", true, getWidth() >= getHeight());
  menu.addSeparator();

  // Runtime plugin role controls while split products are in progress
  const auto role = effectivePluginRole();
  const bool masterLockedByRoom = isMasterRoleLockedByRoom();
  const bool canSelectMaster = !masterLockedByRoom || role == "master";
  menu.addSectionHeader("Plugin Role");
  menu.addItem(20,
               masterLockedByRoom ? "Master (locked: active master already in room)" : "Master",
               canSelectMaster,
               role == "master");
  menu.addItem(21, "Relay", true, role == "relay");
  menu.addItem(22, "Create", true, role == "create");
  menu.addSeparator();
  
  // Utility options
  menu.addItem(6, "Show Error Logs", true, false);
  menu.addItem(7, "About Inspire VST", true, false);
  
  // Show menu at logo position with options
  juce::PopupMenu::Options options;
  options = options.withTargetComponent(this);
  
  menu.showMenuAsync(options, [this](int result) {
    // Handle selection
    switch (result)
    {
      case 2: // Leave Room
        leaveRoom();
        break;
        
      case 3: // Logout
        logout();
        break;
        
      case 4: // Portrait Mode
        setSize(520, 680);
        break;
        
      case 5: // Landscape Mode
        setSize(800, 600);
        break;
        
      case 6: // Show Error Logs
        showErrorLogs();
        break;
        
      case 7: // About
        juce::AlertWindow::showMessageBoxAsync(
          juce::MessageBoxIconType::InfoIcon,
          "About Inspire VST",
          "Inspire VST v1.0\n\n"
          "Collaboration Hub for Music Production\n\n"
          "© 2026 Inspire Team\n"
          "Built with JUCE Framework",
          "OK"
        );
        break;
        
      case 8: // Session Info - Show popup
        showSessionInfoPopup();
        break;

      case 20:
      case 21:
      case 22:
      {
        if (result == 20 && isMasterRoleLockedByRoom() && !isMasterRole())
        {
          addErrorLog("✗ Master role locked: another Master instance is active in this room.");
          setStatus("Master role unavailable in this room (already claimed).");
          updateUIForAuthState();
          break;
        }

        pluginRole = (result == 20 ? "master" : (result == 21 ? "relay" : "create"));
        roleAttached = false;
        roleLockedByMasterRequirement = false;
        roleLockReason.clear();
        if (pluginRole == "master")
          masterInstanceId = pluginInstanceID;
        addErrorLog("Switched plugin role to " + pluginRole.toUpperCase());
        setStatus("Plugin role set to " + pluginRole.toUpperCase());
        saveSessionData();
        updateUIForAuthState();
        break;
      }
        
      default:
        break;
    }
  });
}

// Inspiration list model implementations
int InspireVSTAudioProcessorEditor::InspirationListModel::getNumRows()
{
  return owner.inspirationQueue.size();
}

void InspireVSTAudioProcessorEditor::InspirationListModel::paintListBoxItem(int row, juce::Graphics& g, int width, int height, bool rowIsSelected)
{
  if (row < 0 || row >= owner.inspirationQueue.size()) return;
  juce::var v = owner.inspirationQueue.getReference(row);
  juce::String title;
  if (v.isObject() && v.getDynamicObject()) title = v.getDynamicObject()->getProperty("title").toString();
  g.fillAll(rowIsSelected ? juce::Colour(24,24,40) : juce::Colour(10,16,37));
  g.setColour(juce::Colour(241,245,255));
  g.setFont(juce::Font(juce::FontOptions(12.0f).withKerningFactor(0.02f)));
  g.drawText(title, 8, 6, width - 16, height - 8, juce::Justification::centredLeft);
}

void InspireVSTAudioProcessorEditor::InspirationListModel::listBoxItemClicked(int row, const juce::MouseEvent&)
{
  if (row < 0 || row >= owner.inspirationQueue.size()) return;
  owner.renderGeneratedPack(owner.inspirationQueue.getReference(row));
}

// Dialog helpers
static void showJoinRoomDialog(juce::Component* parent, const juce::String& initialRoomId, const juce::String& initialCode,
                               std::function<void(juce::String, juce::String)> onAccept)
{
  auto* alert = new juce::AlertWindow("Join Room", "Enter room code. Room ID is optional for legacy rooms.", juce::AlertWindow::NoIcon, parent);
  alert->addTextEditor("roomId", initialRoomId, "Room ID or Room Code");
  alert->addTextEditor("code", initialCode, "Room Code or Password", true);
  alert->addButton("Join", 1, juce::KeyPress(juce::KeyPress::returnKey));
  alert->addButton("Cancel", 0, juce::KeyPress(juce::KeyPress::escapeKey));
  alert->enterModalState(true, juce::ModalCallbackFunction::create(
    [alert, onAccept = std::move(onAccept)](int result) mutable {
      std::unique_ptr<juce::AlertWindow> cleanup(alert);
      if (result != 1) return;
      auto roomId = alert->getTextEditorContents("roomId").trim();
      auto code = alert->getTextEditorContents("code").trim();
      if (code.isEmpty() && roomId.isNotEmpty())
        code = roomId;
      if (code.isEmpty()) return;
      onAccept(roomId, code);
    }), false);
}

static void showCreateRoomDialog(juce::Component* parent, const juce::String& initialPassword,
                                 std::function<void(juce::String)> onAccept)
{
  auto* alert = new juce::AlertWindow("Create Room", "Optional password for the room.", juce::AlertWindow::NoIcon, parent);
  alert->addTextEditor("password", initialPassword, "Password (optional)", true);
  alert->addButton("Create", 1, juce::KeyPress(juce::KeyPress::returnKey));
  alert->addButton("Cancel", 0, juce::KeyPress(juce::KeyPress::escapeKey));
  alert->enterModalState(true, juce::ModalCallbackFunction::create(
    [alert, onAccept = std::move(onAccept)](int result) mutable {
      std::unique_ptr<juce::AlertWindow> cleanup(alert);
      if (result != 1) return;
      auto password = alert->getTextEditorContents("password").trim();
      onAccept(password);
    }), false);
}

void InspireVSTAudioProcessorEditor::addPackToInspirationQueue(const juce::var& pack)
{
  inspirationQueue.insert(0, pack);
  inspirationQueueList.updateContent();
  setStatus("Added to Inspiration Queue");
  addErrorLog("Added pack to Inspiration Queue: " + juce::String(inspirationQueue.size()));
}

void InspireVSTAudioProcessorEditor::openWritingNotepadWithPack(const juce::var& pack)
{
  if (!pack.isObject()) return;
  juce::DynamicObject* obj = pack.getDynamicObject();
  if (!obj) return;
  juce::String text;
  text += obj->getProperty("title").toString() + "\n\n";
  text += obj->getProperty("summary").toString() + "\n\n";
  auto powerWords = obj->getProperty("powerWords");
  if (powerWords.isArray())
  {
    text += "Power Words:\n";
    for (auto& p : *powerWords.getArray()) text += "- " + p.toString() + "\n";
    text += "\n";
  }
  auto lf = obj->getProperty("lyricFragments");
  if (lf.isArray())
  {
    text += "Lyric Fragments:\n";
    for (auto& l : *lf.getArray()) text += l.toString() + "\n";
    text += "\n";
  }
  if (lyricEditorComponent)
  {
    lyricEditorComponent->setText(text);
    lyricEditorComponent->grabKeyboardFocus();
  }
}

// Compatibility wrapper: some call sites use addToInspirationQueue name
void InspireVSTAudioProcessorEditor::addToInspirationQueue(const juce::var& pack)
{
  addPackToInspirationQueue(pack);
}

void InspireVSTAudioProcessorEditor::runAsync(std::function<void()> task)
{
  threadPool.addJob(new LambdaJob(std::move(task)), true);
}

void InspireVSTAudioProcessorEditor::setStatus(const juce::String& message)
{
  statusLabel.setText(message, juce::dontSendNotification);
}

void InspireVSTAudioProcessorEditor::setLastTransferReceipt(const juce::String& receipt)
{
  if (receipt.trim().isEmpty())
    return;
  lastTransferDisplay.setText(receipt, false);
}

void InspireVSTAudioProcessorEditor::setBusy(bool shouldBeBusy)
{
  busy = shouldBeBusy;
  const bool roleMaster = isMasterRole();
  const bool roleWorker = isRelayOrCreateRole();
  guestButton.setEnabled(!busy && !isAuthenticated);
  signupButton.setEnabled(!busy && !isAuthenticated);
  loginButton.setEnabled(!busy && !isAuthenticated);
  joinButton.setEnabled(!busy && isAuthenticated);
  createRoomButton.setEnabled(!busy && isAuthenticated && roleMaster);
  viewActiveRoomsButton.setEnabled(!busy && isAuthenticated && roleMaster);
  refreshButton.setEnabled(!busy && isAuthenticated && sessionToken.isNotEmpty());
  downloadButton.setEnabled(!busy && isAuthenticated && sessionToken.isNotEmpty());
  if (roleWorker && roleLockedByMasterRequirement)
  {
    pushTrackButton.setEnabled(false);
    pullTrackButton.setEnabled(false);
    attachArtifactButton.setEnabled(false);
    sourceInstanceCombo.setEnabled(false);
  }
  else
  {
    pushTrackButton.setEnabled(!busy);
    pullTrackButton.setEnabled(!busy);
    attachArtifactButton.setEnabled(!busy);
    sourceInstanceCombo.setEnabled(!busy && sourceOptionInstanceIds.size() > 0);
  }
}

void InspireVSTAudioProcessorEditor::updateUIForAuthState()
{
  const auto role = effectivePluginRole();
  const auto roleAccent = roleAccentColour();

  // Update auth status label
  if (isAuthenticated)
  {
    juce::String statusText = isGuest ? "Auth: Guest" : "Auth: User";
    if (authUsername.isNotEmpty())
    {
      statusText += " (" + authUsername + ")";
    }
    authStatusLabel.setText(statusText, juce::dontSendNotification);
    authStatusLabel.setColour(juce::Label::textColourId, juce::Colour(34, 211, 238).withAlpha(0.9f));
  }
  else
  {
    authStatusLabel.setText("Auth: Not Signed In", juce::dontSendNotification);
    authStatusLabel.setColour(juce::Label::textColourId, juce::Colour(248, 113, 113).withAlpha(0.9f));
  }

  roleStatusLabel.setText("Role: " + role.toUpperCase(), juce::dontSendNotification);
  roleStatusLabel.setColour(juce::Label::textColourId, roleAccent.withAlpha(0.95f));
  roleBadgeLabel.setText(role.toUpperCase(), juce::dontSendNotification);
  roleBadgeLabel.setColour(juce::Label::textColourId, roleAccent.withAlpha(0.95f));
  updatesCard.setButtonText(isMasterRole() ? "Project" : "Updates");

  // Show/hide components based on auth state
  const bool showAuthButtons = !isAuthenticated;
  const bool showPostAuthButtons = isAuthenticated && !inRoom && selectedMode.isEmpty();  // Home screen only
  const bool inRoomCollaboration = isAuthenticated && inRoom;
  const bool roleMaster = isMasterRole();
  const bool roleCreate = effectivePluginRole() == "create";
  
  // *** KEY CHANGE: Mode cards show once authenticated, not requiring a room ***
  const bool showModeCards = isAuthenticated && selectedMode.isEmpty();

  serverUrlInput.setVisible(!isAuthenticated);

  guestButton.setVisible(showAuthButtons);
  signupButton.setVisible(showAuthButtons);
  loginButton.setVisible(showAuthButtons);

  // Room collaboration controls (optional)
  const bool showRoomJoinControls = showPostAuthButtons;
  roomIdInput.setVisible(showRoomJoinControls && roleMaster);
  codeInput.setVisible(showRoomJoinControls);
  passwordInput.setVisible(showPostAuthButtons && roleMaster);
  joinButton.setVisible(showRoomJoinControls);
  createRoomButton.setVisible(showPostAuthButtons && roleMaster);
  viewActiveRoomsButton.setVisible(showPostAuthButtons && roleMaster);
  joinButton.setButtonText(roleMaster ? "Join Room" : "Attach to Room");
  
  // Mode cards (shown when authenticated and no specific mode selected)
  writerLabCard.setVisible(showModeCards && roleCreate);
  producerLabCard.setVisible(showModeCards && roleCreate);
  editorSuiteCard.setVisible(showModeCards && roleCreate);
  updatesCard.setVisible(showModeCards);
  writerLabCard.setEnabled(roleCreate);
  producerLabCard.setEnabled(roleCreate);
  editorSuiteCard.setEnabled(roleCreate);
  updatesCard.setEnabled(true);

  // Mode title and back button (shown when a mode is selected)
  bool inModeView = !selectedMode.isEmpty();
  modeTitleLabel.setVisible(inModeView);
  backButton.setVisible(inModeView);

  // Pack list shown when authenticated and in creative/search modes
  const bool inCreativeMode = isAuthenticated && (selectedMode == "writer" || selectedMode == "producer" || selectedMode == "editor");
  const bool inSearchMode = isAuthenticated && (selectedMode == "search");

  // Keep auth/role indicators visible as a persistent status bar.
  authStatusLabel.setVisible(true);
  roleStatusLabel.setVisible(true);
  roleBadgeLabel.setVisible(true);

  // Push/Pull buttons and log: only visible when in a room AND in Updates mode
  const bool inUpdatesMode = inRoomCollaboration && selectedMode == "updates";
  pushTrackButton.setVisible(inUpdatesMode);
  pullTrackButton.setVisible(inUpdatesMode);
  attachArtifactButton.setVisible(inUpdatesMode);
  sourceInstanceLabel.setVisible(inUpdatesMode);
  sourceInstanceCombo.setVisible(inUpdatesMode);
  destinationInstanceLabel.setVisible(inUpdatesMode);
  destinationInstanceValue.setVisible(inUpdatesMode);
  lastTransferLabel.setVisible(inUpdatesMode);
  lastTransferDisplay.setVisible(inUpdatesMode);
  recordReadyLabel.setVisible(inUpdatesMode);
  recordReadyDisplay.setVisible(inUpdatesMode);
  const bool workerLocked = isRelayOrCreateRole() && roleLockedByMasterRequirement;
  if (inUpdatesMode)
  {
    if (workerLocked)
    {
      pushTrackButton.setEnabled(false);
      pullTrackButton.setEnabled(false);
      attachArtifactButton.setEnabled(false);
      sourceInstanceCombo.setEnabled(false);
      if (roleLockReason.isNotEmpty())
        syncStatusIndicator.setText("Locked: " + roleLockReason, juce::dontSendNotification);
    }
    else
    {
      const bool canOperate = !busy;
      const bool hasSourceOptions = sourceOptionInstanceIds.size() > 0;
      const bool hasSelectedSource = selectedSourceTrackId.isNotEmpty();
      pushTrackButton.setEnabled(canOperate);
      pullTrackButton.setEnabled(canOperate && hasSelectedSource);
      attachArtifactButton.setEnabled(canOperate);
      sourceInstanceCombo.setEnabled(canOperate && hasSourceOptions);
    }
  }
  pushLogDisplay.setVisible(inUpdatesMode);
  pushLogLabel.setVisible(inUpdatesMode);

  // Room info labels are hidden in creative modes to avoid duplicate session info
  roomInfoLabel.setVisible(inRoomCollaboration && !inCreativeMode);
  roomPasswordLabel.setVisible(inRoomCollaboration && !inCreativeMode);

  packList.setVisible(inCreativeMode || inSearchMode);
  // Generate button only for creative modes (not search)
  generatePackButton.setVisible(inCreativeMode);
  remixPackButton.setVisible(inCreativeMode);
  savePackButton.setVisible(inCreativeMode);
  openNotepadButton.setVisible(inCreativeMode);

  // Search card should only be visible when the main mode cards are shown
  searchCard.setVisible(showModeCards);

  // Search controls are transient and should only be visible when in Search mode
  searchInput.setVisible(inSearchMode);
  searchGoButton.setVisible(inSearchMode);
  searchPrevButton.setVisible(inSearchMode);
  searchNextButton.setVisible(inSearchMode);
  searchPageLabel.setVisible(inSearchMode);

  refreshButton.setVisible(false);
  downloadButton.setVisible(false);
  tokenLabel.setVisible(false);
  syncStatusLabel.setVisible(false);
  fileList.setVisible(false);
  statusLabel.setVisible(true);

  resized();
}

void InspireVSTAudioProcessorEditor::startGuestMode()
{
  if (busy)
  {
    return;
  }

  setBusy(true);
  setStatus("Starting guest session...");

  const auto serverUrl = serverUrlInput.getText();

  runAsync([this, serverUrl] {
    addErrorLog("Attempting guest login at: " + serverUrl);
    const auto result = client.continueAsGuest(serverUrl, effectivePluginRole());
    juce::MessageManager::callAsync([this, result] {
      if (result.token.isNotEmpty())
      {
        sessionToken = result.token;
        lastServerTimeMs = juce::Time::currentTimeMillis();  // Store current time, not expiration time
        isAuthenticated = true;
        isGuest = true;
        authUsername = "Guest";
        sessionStartTimeMs = juce::Time::currentTimeMillis();  // Reset session start time for new session
        
        addErrorLog("✓ Guest login successful. Session: " + result.token.substring(0, 16) + "...");
        saveSessionData();
        updateUIForAuthState();
        setStatus("Guest mode active (15 min session)");
      }
      else
      {
        addErrorLog("✗ Guest login failed. Check connection.");
        setStatus("Failed to start guest session. Check connection.");
      }
      setBusy(false);
    });
  });
}

void InspireVSTAudioProcessorEditor::startSignup()
{
  if (busy)
  {
    return;
  }

  setStatus("Opening signup in browser...");

  // In local dev, backend is usually :3001 and frontend is :3000.
  // In deployed environments, frontend and backend may share origin.
  auto resolveFrontendBaseUrl = [] (juce::String apiUrl) -> juce::String
  {
    apiUrl = apiUrl.trim();
    if (apiUrl.isEmpty())
      return "https://localhost:3000";

    while (apiUrl.endsWithChar('/'))
      apiUrl = apiUrl.dropLastCharacters(1);

    if (!apiUrl.startsWithIgnoreCase("http://") && !apiUrl.startsWithIgnoreCase("https://"))
      apiUrl = "http://" + apiUrl;

    juce::URL parsed(apiUrl);
    const auto host = parsed.getDomain();
    const auto port = parsed.getPort();

    if (host.isEmpty())
      return "https://localhost:3000";

    if (port == 3001)
      return "https://" + host + ":3000";

    // If no explicit port is set, treat it as an API host input and target the dev frontend.
    if (port <= 0)
      return "https://" + host + ":3000";

    return apiUrl;
  };

  juce::String webUrl = resolveFrontendBaseUrl(serverUrlInput.getText());
  pendingAuthBridgeId = juce::Uuid().toString().retainCharacters("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789").substring(0, 24);
  pendingAuthBridgeStartedAtMs = juce::Time::currentTimeMillis();
  lastAuthBridgePollAtMs = 0;
  authBridgePollInFlight = false;

  juce::URL signupUrl(webUrl + "/signup?vst_bridge_id=" + juce::URL::addEscapeChars(pendingAuthBridgeId, true));
  signupUrl.launchInDefaultBrowser();

  // Poll bridge completion while waiting for browser auth.
  startTimer(1000);

  setStatus("Complete signup in browser, then click Login.");
}

void InspireVSTAudioProcessorEditor::startLogin()
{
  if (busy)
  {
    return;
  }

  setStatus("Opening login in browser...");

  auto resolveFrontendBaseUrl = [] (juce::String apiUrl) -> juce::String
  {
    apiUrl = apiUrl.trim();
    if (apiUrl.isEmpty())
      return "https://localhost:3000";

    while (apiUrl.endsWithChar('/'))
      apiUrl = apiUrl.dropLastCharacters(1);

    if (!apiUrl.startsWithIgnoreCase("http://") && !apiUrl.startsWithIgnoreCase("https://"))
      apiUrl = "http://" + apiUrl;

    juce::URL parsed(apiUrl);
    const auto host = parsed.getDomain();
    const auto port = parsed.getPort();

    if (host.isEmpty())
      return "https://localhost:3000";

    if (port == 3001)
      return "https://" + host + ":3000";

    if (port <= 0)
      return "https://" + host + ":3000";

    return apiUrl;
  };

  juce::String webUrl = resolveFrontendBaseUrl(serverUrlInput.getText());
  pendingAuthBridgeId = juce::Uuid().toString().retainCharacters("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789").substring(0, 24);
  pendingAuthBridgeStartedAtMs = juce::Time::currentTimeMillis();
  lastAuthBridgePollAtMs = 0;
  authBridgePollInFlight = false;

  juce::URL loginUrl(webUrl + "/login?vst_bridge_id=" + juce::URL::addEscapeChars(pendingAuthBridgeId, true));
  loginUrl.launchInDefaultBrowser();

  // Poll bridge completion while waiting for browser auth.
  startTimer(1000);

  setStatus("Login in browser, then return here.");
}

void InspireVSTAudioProcessorEditor::startJoin()
{
  if (busy || !isAuthenticated)
  {
    return;
  }

  const auto initialRoomId = roomIdInput.getText().trim();
  const auto initialCode = codeInput.getText().trim();

  showJoinRoomDialog(this, initialRoomId, initialCode,
    [this](juce::String roomId, juce::String code) {
      roomIdInput.setText(roomId, false);
      codeInput.setText(code, false);
      joinRoomWithCredentials(roomId, code, false);
    });
}

void InspireVSTAudioProcessorEditor::joinRoomWithCredentials(const juce::String& roomId,
                                                             const juce::String& code,
                                                             bool fromSavedRoom)
{
  const auto trimmedRoomId = roomId.trim();
  auto trimmedCode = code.trim();
  if (trimmedCode.isEmpty() && trimmedRoomId.isNotEmpty())
    trimmedCode = trimmedRoomId;

  if (trimmedCode.isEmpty())
  {
    setStatus("Room code is required.");
    return;
  }

  setBusy(true);
  setStatus(fromSavedRoom ? "Rejoining room..." : "Joining room...");

  const auto serverUrl = serverUrlInput.getText().trim();
  const auto role = effectivePluginRole();

  if (isRelayOrCreateRole())
  {
    runAsync([this, serverUrl, trimmedCode, role] {
      auto attachResult = client.attachPluginToMaster(serverUrl, sessionToken, role, trimmedCode.toUpperCase(), pluginInstanceID);
      juce::String refreshedToken;

      if (!attachResult.ok && isAuthTokenFailureMessage(attachResult.errorMessage))
      {
        const auto refreshResult = client.continueAsGuest(serverUrl, role);
        if (refreshResult.token.isNotEmpty())
        {
          refreshedToken = refreshResult.token;
          attachResult = client.attachPluginToMaster(serverUrl, refreshedToken, role, trimmedCode.toUpperCase(), pluginInstanceID);
        }
      }

      juce::MessageManager::callAsync([this, attachResult, refreshedToken, trimmedCode, role] {
        if (attachResult.ok)
        {
          if (refreshedToken.isNotEmpty())
          {
            sessionToken = refreshedToken;
            addErrorLog("ℹ Refreshed VST relay session token.");
          }
          currentSyncRoomCode = attachResult.roomCode.isNotEmpty() ? attachResult.roomCode : trimmedCode.toUpperCase();
          masterInstanceId = attachResult.masterInstanceId;
          roleAttached = true;
          roleLockedByMasterRequirement = false;
          roleLockReason.clear();
          inRoom = true;
          codeInput.setText(currentSyncRoomCode, false);
          roomInfoLabel.setText("Room: " + currentSyncRoomCode, juce::dontSendNotification);
          tokenLabel.setText("Session: " + sessionToken.substring(0, 12) + "...", juce::dontSendNotification);
          addErrorLog("✓ " + role.toUpperCase() + " attached to Master " + masterInstanceId);
          setStatus("Attached to Master in room " + currentSyncRoomCode);
          updateSessionInfoDisplay();
          saveSessionData();
          updateUIForAuthState();
          startSyncPolling();
        }
        else
        {
          roleAttached = false;
          roleLockedByMasterRequirement = true;
          roleLockReason = attachResult.errorMessage.isNotEmpty() ? attachResult.errorMessage : "master_required";
          addErrorLog("✗ Attach failed: " + roleLockReason);
          setStatus("Attach failed: " + roleLockReason);
          updateUIForAuthState();
        }
        setBusy(false);
      });
    });
    return;
  }

  const auto roomRef = trimmedRoomId.isNotEmpty() ? trimmedRoomId : trimmedCode;
  runAsync([this, serverUrl, roomRef, trimmedCode, role, fromSavedRoom] {
    addErrorLog("Joining room reference: " + roomRef + " using access code: " + trimmedCode);
    const auto result = client.joinRoom(serverUrl, roomRef, trimmedCode, role, pluginInstanceID, masterInstanceId);
    juce::MessageManager::callAsync([this, result, trimmedCode, fromSavedRoom] {
      if (result.token.isNotEmpty())
      {
        const bool keepExistingAuthToken = !isGuest && tokenLooksLikeJwt(sessionToken);
        if (!keepExistingAuthToken)
          sessionToken = result.token;
        lastServerTimeMs = result.expiresAtMs;
        if (result.roomId.isNotEmpty())
          roomIdInput.setText(result.roomId, false);
        currentSyncRoomCode = result.roomCode.isNotEmpty() ? result.roomCode : trimmedCode.toUpperCase();
        masterInstanceId = pluginInstanceID;
        roleAttached = true;
        roleLockedByMasterRequirement = false;
        roleLockReason.clear();
        codeInput.setText(currentSyncRoomCode, false);
        saveSessionData();
        inRoom = true;
        saveRoomCode();
        roomInfoLabel.setText("Room: " + currentSyncRoomCode, juce::dontSendNotification);
        if (roomPasswordLabel.getText().isEmpty())
          roomPasswordLabel.setText("Password: (none)", juce::dontSendNotification);
        tokenLabel.setText("Session: " + sessionToken.substring(0, 12) + "...", juce::dontSendNotification);
        addErrorLog("✓ Room joined successfully (roomCode=" + currentSyncRoomCode + ")");
        setStatus((fromSavedRoom ? "Rejoined " : "Joined ") + currentSyncRoomCode + ". Select your mode.");

        updateSessionInfoDisplay();
        updateUIForAuthState();
        startSyncPolling();
      }
      else
      {
        juce::String reason = result.errorMessage.isNotEmpty() ? result.errorMessage : juce::String("Check room ID/code.");
        addErrorLog("✗ Join failed: " + reason);
        setStatus("Join failed: " + reason);
      }
      setBusy(false);
    });
  });
}

void InspireVSTAudioProcessorEditor::startViewActiveRooms()
{
  if (busy || !isAuthenticated || !isMasterRole())
    return;

  setBusy(true);
  setStatus("Loading your active rooms...");

  const auto serverUrl = serverUrlInput.getText().trim();
  runAsync([this, serverUrl] {
    const auto response = client.getMyRooms(serverUrl, sessionToken);
    const auto parsed = juce::JSON::parse(response);

    juce::MessageManager::callAsync([this, parsed] {
      setBusy(false);

      if (!parsed.isObject() || parsed.getDynamicObject() == nullptr)
      {
        setStatus("Unable to load your rooms.");
        return;
      }

      auto* root = parsed.getDynamicObject();
      const auto activeVar = root->getProperty("active");
      const auto inactiveVar = root->getProperty("inactive");
      auto* active = activeVar.getArray();
      auto* inactive = inactiveVar.getArray();

      juce::PopupMenu menu;
      juce::Array<juce::String> roomIds;
      juce::Array<juce::String> roomCodes;
      int commandId = 200;

      auto addRooms = [&menu, &roomIds, &roomCodes, &commandId](const juce::var& roomsVar,
                                                                 const juce::String& prefix)
      {
        if (!roomsVar.isArray() || roomsVar.getArray() == nullptr)
          return;

        for (const auto& roomVar : *roomsVar.getArray())
        {
          if (!roomVar.isObject() || roomVar.getDynamicObject() == nullptr)
            continue;

          auto* room = roomVar.getDynamicObject();
          const auto roomId = room->getProperty("id").toString();
          const auto roomCode = room->getProperty("roomCode").toString();
          const auto title = room->getProperty("title").toString();
          if (roomId.isEmpty() || roomCode.isEmpty())
            continue;

          juce::String label = prefix + " " + roomCode;
          if (title.isNotEmpty())
            label += " - " + title;

          menu.addItem(commandId, label);
          roomIds.add(roomId);
          roomCodes.add(roomCode);
          ++commandId;
        }
      };

      menu.addSectionHeader("My Active Rooms");
      addRooms(activeVar, "[Active]");
      if (active == nullptr || active->isEmpty())
        menu.addItem(1, "No active rooms found", false, false);

      menu.addSeparator();
      menu.addSectionHeader("Previous Rooms");
      addRooms(inactiveVar, "[Previous]");
      if (inactive == nullptr || inactive->isEmpty())
        menu.addItem(2, "No previous rooms found", false, false);

      menu.showMenuAsync(juce::PopupMenu::Options().withTargetComponent(&viewActiveRoomsButton),
        [this, roomIds, roomCodes](int result) {
          if (result < 200)
          {
            setStatus("Room list ready.");
            return;
          }

          const int index = result - 200;
          if (index < 0 || index >= roomIds.size() || index >= roomCodes.size())
            return;

          roomIdInput.setText(roomIds[index], false);
          codeInput.setText(roomCodes[index], false);
          joinRoomWithCredentials(roomIds[index], roomCodes[index], true);
        });
    });
  });
}

void InspireVSTAudioProcessorEditor::startCreateRoom()
{
  if (busy || !isAuthenticated)
  {
    return;
  }

  if (!isMasterRole())
  {
    setStatus("Only Master role can create rooms.");
    return;
  }

  const auto initialPassword = passwordInput.getText().trim();

  showCreateRoomDialog(this, initialPassword,
    [this](juce::String password) {
      passwordInput.setText(password, false);

      setBusy(true);
      setStatus("Creating room...");

      const auto serverUrl = serverUrlInput.getText().trim();

      runAsync([this, serverUrl, password] {
        juce::String pwdDisplay = password.isEmpty() ? juce::String("(none)") : juce::String("***");
        addErrorLog("Creating room with password: " + pwdDisplay);
        const auto result = client.createRoom(serverUrl,
                      password,
                      isGuest,
                      effectivePluginRole(),
                      pluginInstanceID,
                      sessionToken);
        juce::MessageManager::callAsync([this, result, password] {
          if (result.roomId.isNotEmpty() && result.code.isNotEmpty())
          {
            roomIdInput.setText(result.roomId, false);
            codeInput.setText(result.code, false);
            currentSyncRoomCode = result.code;
            masterInstanceId = pluginInstanceID;
            roleAttached = true;
            roleLockedByMasterRequirement = false;
            roleLockReason.clear();
            inRoom = true;  // Mark as in a room
            saveRoomCode();
            
            juce::String expiryInfo = isGuest ? " (15 min expiry)" : "";
            addErrorLog("✓ Room created: " + result.roomId + " Code: " + result.code);
            setStatus("Room created! Select your mode." + expiryInfo);
            // Show room info at top
            roomInfoLabel.setText("Room: " + result.code, juce::dontSendNotification);
            roomPasswordLabel.setText("Password: " + (password.isEmpty() ? "(none)" : password), juce::dontSendNotification);
            
            // Persist session data
            sessionStartTimeMs = juce::Time::currentTimeMillis();
            authStatus = isGuest ? "guest" : "authenticated";
            saveSessionData();
            
            // Update session info display
            updateSessionInfoDisplay();
            
            updateUIForAuthState();  // Show mode cards
          }
          else
          {
            addErrorLog("✗ Room creation failed.");
            setStatus("Failed to create room. Check server connection.");
          }
          setBusy(false);
        });
      });
    });
}

void InspireVSTAudioProcessorEditor::refreshFiles()
{
  if (busy || sessionToken.isEmpty())
  {
    return;
  }
  setBusy(true);
  setStatus("Fetching files...");

  const auto sinceMs = lastServerTimeMs;
  runAsync([this, sinceMs] {
    const auto result = client.listFiles(sessionToken, sinceMs);
    juce::MessageManager::callAsync([this, result] {
      updateFileList(result);
      setBusy(false);
    });
  });
}

void InspireVSTAudioProcessorEditor::updateSessionInfoDisplay()
{
  if (!inRoom)
  {
    inspirationQueueDisplay.setText("Session Info\n\nNot in a room yet.", false);
    return;
  }
  
  juce::String info;
  info << "Session Info\n\n";
  info << "Room Code: " << codeInput.getText() << "\n";
  info << "Password: " << roomPasswordLabel.getText().fromFirstOccurrenceOf(": ", false, false) << "\n";
  info << "Auth: " << (isGuest ? "Guest" : "User") << "\n";
  
  // Calculate time left for guest sessions
  if (isGuest && lastServerTimeMs > 0)
  {
    juce::int64 now = juce::Time::currentTimeMillis();
    juce::int64 elapsed = (now - lastServerTimeMs) / 1000; // seconds
    juce::int64 remaining = 900 - elapsed; // 15 mins = 900 seconds
    if (remaining > 0)
    {
      int mins = static_cast<int>(remaining / 60);
      info << "Time left: " << juce::String(mins) << " mins\n";
    }
    else
    {
      info << "Time left: Expired\n";
    }
  }
  else
  {
    info << "Time left: Unlimited\n";
  }
  
  // Plugin instance ID (generate stable ID from processor address)
  info << "Plugin ID: " << juce::String::toHexString((juce::pointer_sized_int)&processor).substring(0, 8) << "\n";
  
  inspirationQueueDisplay.setText(info, false);
}

void InspireVSTAudioProcessorEditor::updateFileList(const InspireListResult& result)
{
  if (result.serverTimeMs > 0)
  {
    lastServerTimeMs = result.serverTimeMs;
  }

  recentlyUpdated.clear();

  for (const auto& item : result.items)
  {
    bool replaced = false;
    for (auto& existing : files)
    {
      if (existing.id == item.id)
      {
        if (item.updatedAtMs > lastSeenUpdates[item.id])
        {
          recentlyUpdated.add(item.id);
        }
        existing = item;
        replaced = true;
        break;
      }
    }
    if (!replaced)
    {
      files.add(item);
      if (item.updatedAtMs > 0)
      {
        recentlyUpdated.add(item.id);
      }
    }
  }

  for (const auto& item : files)
  {
    lastSeenUpdates.set(item.id, item.updatedAtMs);
  }

  fileList.updateContent();
  fileList.repaint();
  setStatus("Files updated.");
}

void InspireVSTAudioProcessorEditor::downloadSelected()
{
  if (busy || sessionToken.isEmpty())
  {
    return;
  }
  const int row = fileList.getSelectedRow();
  if (row < 0 || row >= files.size())
  {
    setStatus("Select a file first.");
    return;
  }

  const auto selected = files.getReference(row);
  setBusy(true);
  setStatus("Preparing download...");

  runAsync([this, selected] {
    const auto url = client.getDownloadUrl(sessionToken, selected.id);
    if (url.isEmpty())
    {
      juce::MessageManager::callAsync([this] {
        setStatus("Download URL unavailable.");
        setBusy(false);
      });
      return;
    }

    const auto outputDir = defaultDownloadDir();
    const auto destination = outputDir.getChildFile(selected.name);
    const bool ok = client.downloadFile(url, destination);
    juce::MessageManager::callAsync([this, ok, destination] {
      if (ok)
      {
        setStatus("Downloaded: " + destination.getFullPathName());
      }
      else
      {
        setStatus("Download failed.");
      }
      setBusy(false);
    });
  });
}

void InspireVSTAudioProcessorEditor::onFilterChanged(const RelevanceFilter& newFilter)
{
  currentFilters = newFilter;
  setStatus("Filters: " + currentFilters.timeframe + " • " + currentFilters.tone + " • " + currentFilters.semantic);
  addErrorLog("Filters updated: timeframe=" + currentFilters.timeframe + ", tone=" + currentFilters.tone + ", semantic=" + currentFilters.semantic);
}

void InspireVSTAudioProcessorEditor::generatePackForSelection()
{
  // Check if guest session has expired
  if (isSessionExpired())
  {
    juce::AlertWindow::showMessageBoxAsync(
      juce::MessageBoxIconType::WarningIcon,
      "⏰ Guest Session Expired",
      "Your guest session has expired. To continue creating packs, please:\n\n"
      "• Sign up for a free account (unlimited time)\n"
      "• Leave this session and start a new guest session\n\n"
      "Guest sessions are limited to 15 minutes.",
      "OK"
    );
    setStatus("Session expired - please sign up or start a new session");
    return;
  }
  
  int row = packList.getSelectedRow();
  if (row < 0)
  {
    // If nothing selected, default to first available pack
    if (packItems.size() > 0)
    {
      row = 0;
      packList.selectRow(0);
    }
    else
    {
      // No submode list available (e.g. mode definitions not loaded).
      // Still allow generating a pack for the currently selected mode.
      // Map UI mode to server submode ids where appropriate.
      juce::String modeForRequest = selectedMode;
      if (selectedMode == "writer") modeForRequest = "lyricist";
      else if (selectedMode == "producer") modeForRequest = "producer";
      else if (selectedMode == "editor") modeForRequest = "editor";

      // Build payload directly and proceed to request
      juce::DynamicObject::Ptr payload = new juce::DynamicObject();
      // If we don't have a specific submode, pick a reasonable default per UI mode
      juce::String defaultSubmode = modeForRequest;
      if (modeForRequest == "lyricist") defaultSubmode = "rapper";
      else if (modeForRequest == "producer") defaultSubmode = "sampler";
      else if (modeForRequest == "editor") defaultSubmode = "image-editor";
      payload->setProperty("submode", defaultSubmode);
      selectedSubmodeId = defaultSubmode;
      juce::DynamicObject::Ptr filters = new juce::DynamicObject();
      filters->setProperty("timeframe", currentFilters.timeframe);
      filters->setProperty("tone", currentFilters.tone);
      filters->setProperty("semantic", currentFilters.semantic);
      payload->setProperty("filters", juce::var(filters));

      const juce::String json = juce::JSON::toString(juce::var(payload));
      // Log and show request even when no pack was selected
      addErrorLog("Generating a pack for: " + selectedMode);
      setStatus("Generating a pack for: " + selectedMode + " — " + modeForRequest);
      const auto serverUrl = serverUrlInput.getText();
      addErrorLog("Endpoint: " + serverUrl + "/api/modes/" + modeForRequest + "/fuel-pack");
      addErrorLog("Request payload: " + json.substring(0, juce::jmin(1600, json.length())));

      runAsync([this, serverUrl, json, modeForRequest] {
        const auto response = client.createModePackForMode(serverUrl, modeForRequest, json, sessionToken);
        juce::MessageManager::callAsync([this, response, serverUrl, modeForRequest] {
          addErrorLog("createModePack response length: " + juce::String(response.length()));
          if (response.length() > 0)
            addErrorLog("createModePack snippet: " + response.substring(0, juce::jmin(800, response.length())));

          if (response.isEmpty())
          {
            // Fallback: create a simple offline pack so Generate Pack still shows something
            juce::DynamicObject::Ptr mock = new juce::DynamicObject();
            mock->setProperty("title", "Offline Generated Pack");
            mock->setProperty("headline", "Demo pack generated locally");
            mock->setProperty("summary", "This is a locally-generated demo pack because the backend did not respond.");
            mock->setProperty("mode", "lyricist");
            juce::Array<juce::var> pw;
            pw.add("neon confession"); pw.add("paper plane flex"); pw.add("bytecode lullaby");
            mock->setProperty("powerWords", juce::var(pw));
            juce::Array<juce::var> fragments;
            fragments.add("I fold my feelings into a paper plane");
            fragments.add("midnight code and neon lights");
            mock->setProperty("lyricFragments", juce::var(fragments));
            mock->setProperty("label", "Demo Pack #" + juce::String(packItems.size() + 1));
            mock->setProperty("description", "Offline generated pack");
            
              // Add to generated packs list so it appears as interactive card button
              generatedPackItems.insert(0, juce::var(mock));
            
              // Add to inspiration queue for reference
            inspirationQueue.insert(0, juce::var(mock));
            inspirationQueueList.updateContent();
            
            // Don't auto-show detail - let user click pack card to view
            setStatus("Generated local demo pack");
            
            // Transition to GeneratedView and create pack card buttons
            currentUIState = UIState::GeneratedView;
            createPackCardButtons();
            resized();
          }
          else
          {
            auto parsed = juce::JSON::parse(response);

            if (!parsed.isObject())
            {
              // Non-JSON response (likely HTML error page) — show raw response for debugging
              juce::String lower = response.toLowerCase();
              if (lower.contains("<html") || lower.contains("<pre>"))
              {
                addErrorLog("Server returned HTML response; showing raw body.");
                setStatus("Server error: non-JSON response");
              }
              else
              {
                addErrorLog("Server returned non-object JSON or text.");
                setStatus("Invalid pack format");
              }
            }
            else
            {
              // Inspect for explicit error responses from server
              if (auto* dob = parsed.getDynamicObject())
              {
                auto err = dob->getProperty("error");
                if (!err.isVoid())
                {
                  juce::String errMsg = err.toString();
                  addErrorLog("Server returned error: " + errMsg);
                  setStatus("Server error");
                  setBusy(false);
                  return;
                }

                // If the server wraps the real pack inside a `pack` key, unwrap it
                auto maybePack = dob->getProperty("pack");
                if (maybePack.isObject())
                {
                  parsed = maybePack;
                }
              }

              // Add label and description for pack list display
              if (auto* packObj = parsed.getDynamicObject())
              {
                if (packObj->getProperty("label").isVoid())
                {
                  juce::String title = packObj->getProperty("title").toString();
                  if (title.isEmpty()) title = "Generated Pack";
                  packObj->setProperty("label", title);
                }
                if (packObj->getProperty("description").isVoid())
                {
                  juce::String headline = packObj->getProperty("headline").toString();
                  packObj->setProperty("description", headline);
                }
              }

              // Add to generated packs list so it appears as interactive card button
              generatedPackItems.insert(0, parsed);
              
              // Add to inspiration queue for reference
              inspirationQueue.insert(0, parsed);
              inspirationQueueList.updateContent();
              
              // Don't auto-show detail - let user click pack card to view
              setStatus("Pack generated");
              
              // Transition to GeneratedView and create pack card buttons
              currentUIState = UIState::GeneratedView;
              createPackCardButtons();
              resized();
            }
          }
          setBusy(false);
        });
      });

      return;
    }
  }

  if (row < 0 || row >= packItems.size())
  {
    setStatus("Select a pack first.");
    return;
  }

  auto item = packItems.getReference(row);
  if (!item.isObject())
  {
    setStatus("Invalid pack item.");
    return;
  }

  auto* obj = item.getDynamicObject();
  juce::String submodeId = obj->getProperty("id").toString();
  if (submodeId.isEmpty())
  {
    submodeId = obj->getProperty("label").toString();
  }
  selectedSubmodeId = submodeId;

  // Build a simple ModePackRequest payload
  juce::DynamicObject::Ptr payload = new juce::DynamicObject();
  payload->setProperty("submode", submodeId);
  juce::DynamicObject::Ptr filters = new juce::DynamicObject();
  filters->setProperty("timeframe", currentFilters.timeframe);
  filters->setProperty("tone", currentFilters.tone);
  filters->setProperty("semantic", currentFilters.semantic);
  payload->setProperty("filters", juce::var(filters));

  const juce::String json = juce::JSON::toString(juce::var(payload));
  setBusy(true);
  // Log the user-visible mode (e.g. writer/producer/editor) alongside the submode id
  addErrorLog("Generating a pack for: " + selectedMode);
  setStatus("Generating a pack for: " + selectedMode + " — " + submodeId);

  const auto serverUrl = serverUrlInput.getText();
  // Log endpoint and payload (truncated for readability)
  addErrorLog("Endpoint: " + serverUrl + "/api/modes/" + (selectedMode == "writer" ? "lyricist" : selectedMode) + "/fuel-pack");
  addErrorLog("Request payload: " + json.substring(0, juce::jmin(1600, json.length())));
  // Map UI mode to server mode namespace (writer -> lyricist)
  juce::String modeForRequest = selectedMode;
  if (selectedMode == "writer") modeForRequest = "lyricist";
  else if (selectedMode == "producer") modeForRequest = "producer";
  else if (selectedMode == "editor") modeForRequest = "editor";

  runAsync([this, serverUrl, json, submodeId, modeForRequest] {
    const auto response = client.createModePackForMode(serverUrl, modeForRequest, json, sessionToken);
    juce::MessageManager::callAsync([this, response, serverUrl, submodeId] {
      addErrorLog("createModePack response length: " + juce::String(response.length()));
      if (response.length() > 0)
        addErrorLog("createModePack snippet: " + response.substring(0, juce::jmin(800, response.length())));

      if (response.isEmpty())
      {
        // Fallback: create a simple offline pack so Generate Pack still shows something
        juce::DynamicObject::Ptr mock = new juce::DynamicObject();
        mock->setProperty("title", "Offline Generated Pack");
        mock->setProperty("headline", "Demo pack generated locally");
        mock->setProperty("summary", "This is a locally-generated demo pack because the backend did not respond.");
        mock->setProperty("mode", "lyricist");
        juce::Array<juce::var> pw;
        pw.add("neon confession"); pw.add("paper plane flex"); pw.add("bytecode lullaby");
        mock->setProperty("powerWords", juce::var(pw));
        juce::Array<juce::var> fragments;
        fragments.add("I fold my feelings into a paper plane");
        fragments.add("midnight code and neon lights");
        mock->setProperty("lyricFragments", juce::var(fragments));
        if (mock->getProperty("label").isVoid())
          mock->setProperty("label", mock->getProperty("title").toString());
        if (mock->getProperty("description").isVoid())
          mock->setProperty("description", mock->getProperty("headline").toString());

        generatedPackItems.insert(0, juce::var(mock));
        inspirationQueue.insert(0, juce::var(mock));
        inspirationQueueList.updateContent();

        currentUIState = UIState::GeneratedView;
        createPackCardButtons();
        resized();
        setStatus("Generated local demo pack");
      }
      else
      {
        // Parse and render pack inline, with tolerant handling of wrappers and HTML error pages
        auto parsed = juce::JSON::parse(response);

        if (!parsed.isObject())
        {
          juce::String lower = response.toLowerCase();
          if (lower.contains("<html") || lower.contains("<pre>"))
          {
            addErrorLog("Server returned HTML response; showing raw body.");
            setStatus("Server error: non-JSON response");
          }
          else
          {
            addErrorLog("Server returned non-object JSON or plain text.");
            setStatus("Invalid pack format");
          }
        }
        else
        {
          // Log top-level keys returned by the server for debugging
          if (auto* dob = parsed.getDynamicObject())
          {
            juce::StringArray keys;
            auto& props = dob->getProperties();
            for (int i = 0; i < props.size(); ++i)
              keys.add(props.getName(i).toString());
            addErrorLog("Server returned keys: " + keys.joinIntoString(", "));

            // If server returned an error field, present it
            auto err = dob->getProperty("error");
            if (!err.isVoid())
            {
              juce::String errMsg = err.toString();
              addErrorLog("Server returned error: " + errMsg);
              setStatus("Server error");
              setBusy(false);
              return;
            }

            // Unwrap envelope if server nests pack inside { "pack": { ... } }
            auto maybePack = dob->getProperty("pack");
            if (maybePack.isObject()) parsed = maybePack;
          }

          if (auto* packObj = parsed.getDynamicObject())
          {
            if (packObj->getProperty("label").isVoid())
            {
              juce::String title = packObj->getProperty("title").toString();
              if (title.isEmpty()) title = "Generated Pack";
              packObj->setProperty("label", title);
            }
            if (packObj->getProperty("description").isVoid())
            {
              juce::String headline = packObj->getProperty("headline").toString();
              packObj->setProperty("description", headline);
            }
          }

          generatedPackItems.insert(0, parsed);
          inspirationQueue.insert(0, parsed);
          inspirationQueueList.updateContent();

          currentUIState = UIState::GeneratedView;
          createPackCardButtons();
          resized();
          setStatus("Pack generated");
        }
      }
      setBusy(false);
    });
  });
}

void InspireVSTAudioProcessorEditor::showPackDetail(int index)
{
  juce::Array<juce::var>* source = &packItems;
  if ((selectedMode == "writer" || selectedMode == "producer" || selectedMode == "editor")
      && currentUIState == UIState::GeneratedView)
  {
    source = &generatedPackItems;
  }

  if (index < 0 || index >= source->size())
    return;

  auto var = source->getReference(index);
  if (!var.isObject())
  {
    return;
  }

  // Display the pack in the interactive component
  currentDisplayedPack = var;
  renderGeneratedPack(var);

  // Ensure action buttons and auxiliary UI are visible for generated packs
  savePackButton.setVisible(true);
  insertPackButton.setVisible(true);
  addToQueueButton.setVisible(true);

  // Set meaningfully-enabled states
  savePackButton.setEnabled(true);
  insertPackButton.setEnabled(true);

  // Make writing notepad and inspiration queue visible in writer mode
  lyricEditorComponent->setVisible(true);
  inspirationQueueDisplay.setVisible(true);

  // Wire default actions to operate on the current displayed pack
  addToQueueButton.onClick = [this]() {
    if (currentDisplayedPack.isObject()) addPackToQueue(currentDisplayedPack);
  };
  savePackButton.onClick = [this]() { if (currentDisplayedPack.isObject()) saveSelectedPack(); };
  insertPackButton.onClick = [this]() { if (currentDisplayedPack.isObject()) insertPackIntoDAW(currentDisplayedPack); };
}

void InspireVSTAudioProcessorEditor::renderGeneratedPack(const juce::var& pack)
{
  if (!pack.isObject())
  {
    return;
  }

  auto* obj = pack.getDynamicObject();
  if (obj == nullptr)
  {
    return;
  }

  // Display pack in the new interactive PackDetailComponent
  if (packDetailComponent)
  {
    packDetailComponent->setPack(pack);
  }

  // Show pack-level actions (open notepad)
  openNotepadButton.setVisible(true);
  currentDisplayedPack = pack;
}

void InspireVSTAudioProcessorEditor::saveSelectedPack()
{
  juce::var var = currentDisplayedPack;
  if (!var.isObject())
  {
    const int row = packList.getSelectedRow();
    if (row >= 0 && row < packItems.size())
      var = packItems.getReference(row);
  }

  if (!var.isObject()) { setStatus("Select a pack to save."); return; }

  // Save the JSON for potential retry
  currentPackToSave = juce::JSON::toString(var);
  setBusy(true);
  setStatus("Saving pack...");
  
  // Attempt save with token refresh on auth failure
  attemptSaveWithTokenRefresh();
}

bool InspireVSTAudioProcessorEditor::isResponseAuthError(const juce::String& response)
{
  // Check if response indicates auth failure
  // Look for common error indicators
  juce::String lowerResponse = response.toLowerCase();
  
  return lowerResponse.contains("invalid token")
      || lowerResponse.contains("unauthorized")
      || lowerResponse.contains("401")
      || lowerResponse.contains("authentication failed")
      || lowerResponse.contains("token expired")
      || lowerResponse.contains("session expired");
}

void InspireVSTAudioProcessorEditor::attemptSaveWithTokenRefresh()
{
  const auto serverUrl = serverUrlInput.getText();
  const auto json = currentPackToSave;
  const auto currentToken = sessionToken;
  
  runAsync([this, serverUrl, json, currentToken] {
    // First attempt: Try with current token
    auto response = client.savePack(serverUrl, json, currentToken);
    const bool isAuthError = isResponseAuthError(response);
    
    if (!isAuthError)
    {
      // Success! Response is valid
      juce::MessageManager::callAsync([this, response] {
        if (response.isEmpty())
        {
          setStatus("Failed to save pack.");
        }
        else
        {
          juce::AlertWindow::showMessageBoxAsync(juce::AlertWindow::InfoIcon,
                                                "Pack Saved",
                                                "Save response:\n" + response,
                                                "Close");
          setStatus("Pack saved");
        }
        setBusy(false);
      });
      return;
    }
    
    // Auth error detected - attempt token refresh
    // Currently: Clear session and prompt re-login
    // Future enhancement: Implement server-side token refresh endpoint if available
    juce::MessageManager::callAsync([this, response] {
      juce::AlertWindow::showMessageBoxAsync(juce::AlertWindow::WarningIcon,
                                            "Authentication Error",
                                            "Your session has expired. Please log in again.\n\n"
                                            "Response: " + response,
                                            "Close");
      setStatus("Authentication failed. Please log in.");
      logout();  // Clear auth state
      setBusy(false);
    });
  });
}

void InspireVSTAudioProcessorEditor::exportSelectedPackAsJSON()
{
  juce::var var = currentDisplayedPack;
  if (!var.isObject())
  {
    const int row = packList.getSelectedRow();
    if (row >= 0 && row < packItems.size())
      var = packItems.getReference(row);
  }

  if (!var.isObject()) { setStatus("Select a pack to export."); return; }

  // Convert to pretty-printed JSON
  const juce::String json = juce::JSON::toString(var, true);
  
  // Copy to system clipboard
  juce::SystemClipboard::copyTextToClipboard(json);
  
  setStatus("Pack exported to clipboard! (" + juce::String(json.length()) + " bytes)");
  addErrorLog("Exported pack as JSON - " + juce::String(json.length()) + " bytes copied");
  
  juce::AlertWindow::showMessageBoxAsync(juce::AlertWindow::InfoIcon,
                                        "Pack Exported",
                                        "Pack JSON has been copied to your clipboard!\n\n"
                                        "You can paste it into a file or share it with collaborators.",
                                        "Close");
}

void InspireVSTAudioProcessorEditor::forkSelectedPack()
{
  const int row = packList.getSelectedRow();
  if (row < 0 || row >= packItems.size())
  {
    setStatus("Select a pack to fork.");
    return;
  }

  auto var = packItems.getReference(row);
  if (!var.isObject())
  {
    setStatus("Invalid pack item.");
    return;
  }

  // If we're in Search mode, Fork should clone the item locally (Fork & Remix)
  if (selectedMode == "search")
  {
    // Deep-copy via JSON roundtrip
    juce::String json = juce::JSON::toString(var);
    auto parsed = juce::JSON::parse(json);
    if (parsed.isObject())
    {
      // Insert into the top of the local packs and switch to Writer mode for editing
      packItems.insert(0, parsed);
      selectedMode = "writer";
      modeTitleLabel.setText("Writer Lab", juce::dontSendNotification);
      packList.updateContent();
      packList.selectRow(0);
      currentDisplayedPack = parsed;
      renderGeneratedPack(parsed);
      updateUIForAuthState();
      setStatus("Forked pack locally (Fork & Remix)");
    }
    else
    {
      setStatus("Failed to clone selected pack.");
    }
    return;
  }

  // Default behavior: re-generate a new pack from submode id
  if (auto* obj = var.getDynamicObject())
  {
    juce::String submodeId = obj->getProperty("id").toString();
    if (submodeId.isEmpty())
      submodeId = obj->getProperty("label").toString();

    juce::DynamicObject::Ptr payload = new juce::DynamicObject();
    payload->setProperty("submode", submodeId);
    juce::DynamicObject::Ptr filters = new juce::DynamicObject();
    filters->setProperty("timeframe", currentFilters.timeframe);
    filters->setProperty("tone", currentFilters.tone);
    filters->setProperty("semantic", currentFilters.semantic);
    payload->setProperty("filters", juce::var(filters));

    const juce::String json = juce::JSON::toString(juce::var(payload));
    setBusy(true);
    setStatus("Forking pack: " + submodeId);
    const auto serverUrl = serverUrlInput.getText();
    // Map UI mode to server mode namespace
    juce::String modeForRequest = selectedMode;
    if (selectedMode == "writer") modeForRequest = "lyricist";
    else if (selectedMode == "producer") modeForRequest = "producer";
    else if (selectedMode == "editor") modeForRequest = "editor";

    runAsync([this, serverUrl, json, modeForRequest] {
      const auto response = client.createModePackForMode(serverUrl, modeForRequest, json, sessionToken);
      juce::MessageManager::callAsync([this, response] {
        if (response.isEmpty())
        {
          setStatus("Failed to fork pack.");
        }
        else
        {
          auto parsed2 = juce::JSON::parse(response);
          if (parsed2.isObject())
          {
            if (auto* dob = parsed2.getDynamicObject())
            {
              auto err = dob->getProperty("error");
              if (!err.isVoid())
              {
                juce::String errMsg = err.toString();
                addErrorLog("Server returned error: " + errMsg);
                setStatus("Server error");
                setBusy(false);
                return;
              }
              auto maybePack = dob->getProperty("pack");
              if (maybePack.isObject()) parsed2 = maybePack;
            }
          }

          currentDisplayedPack = parsed2;
          renderGeneratedPack(parsed2);
          setStatus("Pack forked");
        }
        setBusy(false);
      });
    });
  }
}

int InspireVSTAudioProcessorEditor::FileListModel::getNumRows()
{
  return owner.files.size();
}

void InspireVSTAudioProcessorEditor::FileListModel::paintListBoxItem(
  int row,
  juce::Graphics& g,
  int width,
  int height,
  bool rowIsSelected)
{
  if (row < 0 || row >= owner.files.size())
  {
    return;
  }

  const auto& item = owner.files.getReference(row);
  const bool updated = owner.recentlyUpdated.contains(item.id);

  // Glassmorphism background matching web app
  juce::Colour bgColour = rowIsSelected 
    ? juce::Colour(148, 163, 184).withAlpha(0.25f)  // Highlight on select
    : juce::Colour(10, 16, 37).withAlpha(0.35f);      // Default glass background
  
  g.fillAll(bgColour);
  
  // Border
  g.setColour(juce::Colour(148, 163, 184).withAlpha(0.18f));
  g.drawRect(0, 0, width, height, 1);
  
  // Text
  g.setColour(juce::Colour(241, 245, 255).withAlpha(0.9f));
  g.setFont(juce::Font(juce::FontOptions(12.0f)));

  juce::String label = item.name;
  if (updated)
  {
    g.setColour(juce::Colour(34, 211, 238).withAlpha(0.9f));  // Cyan dot
    label = "● " + label;
  }
  
  g.drawText(label, 8, 0, width - 16, height, juce::Justification::centredLeft);
}

int InspireVSTAudioProcessorEditor::PackListModel::getNumRows()
{
  return owner.packItems.size();
}

juce::Component* InspireVSTAudioProcessorEditor::PackListModel::refreshComponentForRow(
  int row,
  bool /*isRowSelected*/,
  juce::Component* existingComponentToUpdate)
{
  if (row < 0 || row >= owner.packItems.size())
    return nullptr;

  PackCard* card = nullptr;
  if (existingComponentToUpdate != nullptr)
  {
    if (auto* existing = dynamic_cast<PackCard*>(existingComponentToUpdate))
    {
      existing->setRow(row);
      card = existing;
    }
  }

  if (card == nullptr)
  {
    card = new PackCard(owner, row);
    card->setRow(row);
  }

  return card;
}

void InspireVSTAudioProcessorEditor::PackListModel::deleteComponentForRow(int /*row*/, juce::Component* componentToDelete)
{
  if (componentToDelete != nullptr)
    delete componentToDelete;
}

InspireVSTAudioProcessorEditor::PackCard::PackCard(InspireVSTAudioProcessorEditor& ownerRef, int rowIndex)
  : owner(ownerRef), row(rowIndex)
{
  addAndMakeVisible(titleLabel);
  addAndMakeVisible(descLabel);
  addAndMakeVisible(previewButton);
  addAndMakeVisible(forkButton);
  addAndMakeVisible(saveButton);
  addAndMakeVisible(queueButton);
  addAndMakeVisible(insertButton);
  addAndMakeVisible(progressBar);

  titleLabel.setFont(juce::Font(juce::FontOptions(13.0f).withKerningFactor(0.02f)));
  titleLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.96f));
  descLabel.setFont(juce::Font(juce::FontOptions(10.0f)));
  descLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.7f));

  previewButton.setColour(juce::TextButton::buttonColourId, juce::Colour(34, 211, 238).withAlpha(0.9f));
  forkButton.setColour(juce::TextButton::buttonColourId, juce::Colour(236, 72, 153).withAlpha(0.9f));
  saveButton.setColour(juce::TextButton::buttonColourId, juce::Colour(168, 85, 247).withAlpha(0.9f));
  queueButton.setColour(juce::TextButton::buttonColourId, juce::Colour(148, 163, 184).withAlpha(0.9f));
  insertButton.setColour(juce::TextButton::buttonColourId, juce::Colour(34, 211, 238).withAlpha(0.85f));

  setRow(rowIndex);
}

void InspireVSTAudioProcessorEditor::PackCard::setRow(int newRow)
{
  row = newRow;
  if (row < 0 || row >= owner.packItems.size())
    return;

  auto& var = owner.packItems.getReference(row);
  if (!var.isObject())
    return;

  auto* obj = var.getDynamicObject();
  juce::String label = obj->getProperty("label").toString();
  juce::String desc = obj->getProperty("description").toString();
  juce::String author = obj->getProperty("author").toString();
  juce::var tagsVar = obj->getProperty("tags");
  juce::String tagsStr;
  if (tagsVar.isArray())
  {
    juce::StringArray parts;
    for (auto& t : *tagsVar.getArray()) parts.add(t.toString());
    tagsStr = parts.joinIntoString(", ");
  }

  titleLabel.setText(label, juce::dontSendNotification);
  juce::String foot;
  if (author.isNotEmpty()) foot += "by " + author;
  if (tagsStr.isNotEmpty()) foot += (foot.isNotEmpty() ? " • " : "") + tagsStr;
  if (foot.isNotEmpty()) desc += "\n" + foot;
  descLabel.setText(desc, juce::dontSendNotification);

  // Wire button actions to operate on this row
  previewButton.onClick = [this] {
    owner.packList.selectRow(row);
    // Attempt to find a preview URL in the pack and play it
    if (row >= 0 && row < owner.packItems.size())
    {
      auto& pv = owner.packItems.getReference(row);
      juce::String url;
      if (pv.isObject())
      {
        auto* dob = pv.getDynamicObject();
        // common fields: 'samples' array, each sample may have 'url' or 'previewUrl'
        auto samples = dob->getProperty("samples");
        if (samples.isArray() && samples.getArray()->size() > 0)
        {
          auto first = samples.getArray()->getReference(0);
          if (first.isObject())
          {
            if (auto* sdo = first.getDynamicObject())
            {
              url = sdo->getProperty("previewUrl").toString();
              if (url.isEmpty()) url = sdo->getProperty("url").toString();
            }
          }
        }
        if (url.isEmpty())
          url = dob->getProperty("previewUrl").toString();
        if (url.isEmpty())
          url = dob->getProperty("sampleUrl").toString();
      }

      if (url.isNotEmpty())
      {
        owner.loadPreviewFromUrlAsync(url, row);
        // show per-card loading
        if (auto* comp = owner.packList.getComponentForRowNumber(row))
        {
          if (auto* card = dynamic_cast<PackCard*>(comp))
          {
            card->setLoading(true);
            card->setProgress(0.0);
          }
        }
      }
      else
      {
        owner.showPackDetail(row);
      }
    }
  };

  // Fork button only visible in Search mode and behaves as 'Fork & Mix'
  forkButton.setVisible(owner.selectedMode == "search");
  if (owner.selectedMode == "search")
    forkButton.setButtonText("Fork & Mix");
  else
    forkButton.setButtonText("");

  forkButton.onClick = [this] {
    owner.packList.selectRow(row);
    owner.forkSelectedPack();
  };

  saveButton.onClick = [this] {
    owner.packList.selectRow(row);
    owner.saveSelectedPack();
  };

  queueButton.onClick = [this] {
    if (row >= 0 && row < owner.packItems.size())
      owner.addPackToQueue(owner.packItems.getReference(row));
  };

  insertButton.onClick = [this] {
    if (row >= 0 && row < owner.packItems.size())
      owner.insertPackIntoDAW(owner.packItems.getReference(row));
  };
  // Initially hide progress bar
  setLoading(false);
}

void InspireVSTAudioProcessorEditor::PackCard::paint(juce::Graphics& g)
{
  auto bounds = getLocalBounds().toFloat();
  g.setColour(juce::Colour(10, 16, 37).withAlpha(0.42f));
  g.fillRoundedRectangle(bounds.reduced(1.0f), 6.0f);
  g.setColour(juce::Colour(148, 163, 184).withAlpha(0.12f));
  g.drawRoundedRectangle(bounds.reduced(1.0f), 6.0f, 1.0f);
}

void InspireVSTAudioProcessorEditor::PackCard::resized()
{
  const int pad = 8;
  const int h = getHeight();
  titleLabel.setBounds(pad, pad, getWidth() - pad * 2, 18);
  descLabel.setBounds(pad, pad + 18, getWidth() - pad * 2, 28);

  const int btnW = 84;
  const int btnH = 22;
  int x = getWidth() - pad - btnW;
  previewButton.setBounds(x, h - pad - btnH, btnW, btnH); x -= (btnW + 6);
  forkButton.setBounds(x, h - pad - btnH, btnW, btnH); x -= (btnW + 6);
  saveButton.setBounds(x, h - pad - btnH, btnW, btnH); x -= (btnW + 6);
  queueButton.setBounds(x, h - pad - btnH, btnW, btnH); x -= (btnW + 6);
  insertButton.setBounds(x, h - pad - btnH, btnW, btnH);
}

void InspireVSTAudioProcessorEditor::PackListModel::paintListBoxItem(
  int row,
  juce::Graphics& g,
  int width,
  int height,
  bool rowIsSelected)
{
  if (row < 0 || row >= owner.packItems.size())
    return;

  auto var = owner.packItems.getReference(row);
  if (!var.isObject())
    return;

  auto* obj = var.getDynamicObject();

  juce::Colour bg = rowIsSelected ? juce::Colour(148, 163, 184).withAlpha(0.25f)
                                  : juce::Colour(10, 16, 37).withAlpha(0.35f);
  g.fillAll(bg);
  g.setColour(juce::Colour(148, 163, 184).withAlpha(0.18f));
  g.drawRect(0, 0, width, height, 1);

  g.setColour(juce::Colour(241, 245, 255).withAlpha(0.95f));
  g.setFont(juce::Font(juce::FontOptions(12.0f)));

  juce::String label = obj->getProperty("label").toString();
  juce::String desc = obj->getProperty("description").toString();

  g.drawText(label, 8, 2, width - 16, 18, juce::Justification::centredLeft);
  g.setColour(juce::Colour(241, 245, 255).withAlpha(0.7f));
  g.setFont(juce::Font(juce::FontOptions(10.0f)));
  g.drawText(desc, 8, 18, width - 16, height - 18, juce::Justification::topLeft);
}

void InspireVSTAudioProcessorEditor::PackListModel::listBoxItemClicked(int row, const juce::MouseEvent&)
{
  owner.showPackDetail(row);
}

juce::String InspireVSTAudioProcessorEditor::detectLocalServerUrl()
{
  juce::IPAddress addr = juce::IPAddress::getLocalAddress();
  juce::String ip = addr.toString();
  if (ip.isEmpty())
    return "http://localhost:3001";
  return juce::String("http://") + ip + ":3001";
}

void InspireVSTAudioProcessorEditor::loadRoomCode()
{
  juce::File configFile(juce::File::getSpecialLocation(juce::File::userHomeDirectory)
    .getChildFile(".inspire-vst-room-code"));
  
  if (configFile.exists() && configFile.getSize() > 0)
  {
    pendingRoomCode = configFile.loadFileAsString().trim();
  }
}

void InspireVSTAudioProcessorEditor::saveRoomCode()
{
  juce::File configFile(juce::File::getSpecialLocation(juce::File::userHomeDirectory)
    .getChildFile(".inspire-vst-room-code"));
  
  configFile.replaceWithText(currentSyncRoomCode);
}

void InspireVSTAudioProcessorEditor::saveSessionData()
{
  juce::DynamicObject::Ptr d = new juce::DynamicObject();
  d->setProperty("token", sessionToken);
  d->setProperty("username", authUsername);
  d->setProperty("isGuest", isGuest);
  d->setProperty("expiresAtMs", lastServerTimeMs);
  
  // Persist room/session info
  d->setProperty("inRoom", inRoom);
  d->setProperty("roomCode", currentSyncRoomCode);
  d->setProperty("roomId", roomIdInput.getText().trim());
  d->setProperty("roomPassword", roomPasswordLabel.getText());
  d->setProperty("authStatus", authStatus);
  d->setProperty("sessionStartTimeMs", static_cast<double>(sessionStartTimeMs));
  d->setProperty("sessionDurationMs", static_cast<double>(sessionDurationMs));
  d->setProperty("pluginInstanceID", pluginInstanceID);
  d->setProperty("pluginRole", pluginRole);
  d->setProperty("masterInstanceId", masterInstanceId);
  d->setProperty("roleAttached", roleAttached);
  d->setProperty("roleLocked", roleLockedByMasterRequirement);
  d->setProperty("roleLockReason", roleLockReason);

  juce::File f = juce::File::getSpecialLocation(juce::File::userHomeDirectory)
    .getChildFile(".inspire-vst-session");
  f.replaceWithText(juce::JSON::toString(juce::var(d)));
}

void InspireVSTAudioProcessorEditor::loadSessionData()
{
  juce::File f = juce::File::getSpecialLocation(juce::File::userHomeDirectory)
    .getChildFile(".inspire-vst-session");
  if (!f.exists() || f.getSize() == 0)
    return;
  auto txt = f.loadFileAsString().trim();
  if (txt.isEmpty()) return;
  auto parsed = juce::JSON::parse(txt);
  if (!parsed.isObject()) return;
  if (auto* dob = parsed.getDynamicObject())
  {
    sessionToken = dob->getProperty("token").toString();
    authUsername = dob->getProperty("username").toString();
    isGuest = dob->getProperty("isGuest");
    lastServerTimeMs = static_cast<int64_t>(dob->getProperty("expiresAtMs"));
    
    // Restore room/session info
    inRoom = dob->getProperty("inRoom");
    juce::String savedRoomCode = dob->getProperty("roomCode").toString();
    juce::String savedRoomId = dob->getProperty("roomId").toString();
    juce::String savedRoomPassword = dob->getProperty("roomPassword").toString();
    currentSyncRoomCode = savedRoomCode.trim();
    if (savedRoomCode.isNotEmpty())
      codeInput.setText(savedRoomCode, juce::NotificationType::dontSendNotification);
    if (savedRoomId.isNotEmpty())
      roomIdInput.setText(savedRoomId, juce::NotificationType::dontSendNotification);
    if (savedRoomCode.isNotEmpty())
    {
      roomInfoLabel.setText("Room: " + savedRoomCode, juce::NotificationType::dontSendNotification);
      roomPasswordLabel.setText(savedRoomPassword, juce::NotificationType::dontSendNotification);
    }
    authStatus = dob->getProperty("authStatus").toString();
    sessionStartTimeMs = static_cast<int64_t>(dob->getProperty("sessionStartTimeMs"));
    sessionDurationMs = static_cast<int64_t>(dob->getProperty("sessionDurationMs"));
    pluginRole = dob->getProperty("pluginRole").toString();
    if (pluginRole.isEmpty())
      pluginRole = "master";
    masterInstanceId = (pluginRole == "master") ? dob->getProperty("masterInstanceId").toString() : juce::String();
    roleAttached = false;
    roleLockedByMasterRequirement = false;
    roleLockReason.clear();

    // Authenticated web sessions should persist a JWT token. If the saved token is
    // a stale room token, force re-auth instead of presenting a false signed-in state.
    if (authStatus == "authenticated" && !tokenLooksLikeJwt(sessionToken))
    {
      sessionToken.clear();
      isAuthenticated = false;
      isGuest = false;
      inRoom = false;
      currentSyncRoomCode.clear();
      roomIdInput.clear();
      codeInput.clear();
      roomInfoLabel.setText("", juce::NotificationType::dontSendNotification);
      roomPasswordLabel.setText("", juce::NotificationType::dontSendNotification);
      setStatus("Session expired. Click Login to refresh auth.");
      addErrorLog("⚠ Cleared stale authenticated session token; please login again.");
      return;
    }

    if (sessionToken.isNotEmpty())
      isAuthenticated = true;
  }
}

void InspireVSTAudioProcessorEditor::startSyncPolling()
{
  if (syncPollTimer != nullptr)
  {
    return;  // Already polling
  }
  
  // Create a timer that polls every 1500ms
  class SyncTimer : public juce::Timer
  {
  public:
    explicit SyncTimer(InspireVSTAudioProcessorEditor& ownerRef) : owner(ownerRef) {}
    
    void timerCallback() override { owner.pollTrackState(); }
    
  private:
    InspireVSTAudioProcessorEditor& owner;
  };
  
  syncPollTimer = new SyncTimer(*this);
  syncPollTimer->startTimer(1500);
}

juce::String InspireVSTAudioProcessorEditor::effectivePluginRole() const
{
  auto role = pluginRole.toLowerCase();
  if (role == "master" || role == "relay" || role == "create")
    return role;
  return "master";
}

bool InspireVSTAudioProcessorEditor::isMasterRoleLockedByRoom() const
{
  if (!inRoom || currentSyncRoomCode.trim().isEmpty())
    return false;

  for (const auto& inst : activeInstances)
  {
    if (!inst.isObject())
      continue;

    auto* instObj = inst.getDynamicObject();
    if (instObj == nullptr)
      continue;

    const auto instanceRole = instObj->getProperty("pluginRole").toString().trim().toLowerCase();
    const auto instanceId = instObj->getProperty("pluginInstanceId").toString().trim();

    if (instanceRole == "master" && instanceId.isNotEmpty() && instanceId != pluginInstanceID)
      return true;
  }

  return false;
}

juce::Colour InspireVSTAudioProcessorEditor::roleAccentColour() const
{
  const auto role = effectivePluginRole();
  if (role == "master") return juce::Colour(16, 185, 129);
  if (role == "relay") return juce::Colour(34, 211, 238);
  if (role == "create") return juce::Colour(236, 72, 153);
  return juce::Colour(148, 163, 184);
}

bool InspireVSTAudioProcessorEditor::isMasterRole() const
{
  return effectivePluginRole() == "master";
}

bool InspireVSTAudioProcessorEditor::isRelayOrCreateRole() const
{
  const auto role = effectivePluginRole();
  return role == "relay" || role == "create";
}

void InspireVSTAudioProcessorEditor::attemptRoleAttachIfNeeded()
{
  if (!isRelayOrCreateRole() || sessionToken.isEmpty() || currentSyncRoomCode.isEmpty())
    return;

  const auto nowMs = juce::Time::currentTimeMillis();
  if (roleAttached && !roleLockedByMasterRequirement)
    return;
  if (nowMs - lastRoleAttachAttemptMs < 5000)
    return;

  lastRoleAttachAttemptMs = nowMs;
  const auto serverUrl = serverUrlInput.getText().trim();
  const auto role = effectivePluginRole();

  runAsync([this, serverUrl, role] {
    auto attach = client.attachPluginToMaster(
      serverUrl,
      sessionToken,
      role,
      currentSyncRoomCode,
      pluginInstanceID
    );

    juce::String refreshedToken;
    if (!attach.ok && isAuthTokenFailureMessage(attach.errorMessage))
    {
      const auto refreshResult = client.continueAsGuest(serverUrl, role);
      if (refreshResult.token.isNotEmpty())
      {
        refreshedToken = refreshResult.token;
        attach = client.attachPluginToMaster(
          serverUrl,
          refreshedToken,
          role,
          currentSyncRoomCode,
          pluginInstanceID
        );
      }
    }

    juce::MessageManager::callAsync([this, attach, role, refreshedToken] {
      if (refreshedToken.isNotEmpty())
      {
        sessionToken = refreshedToken;
        addErrorLog("ℹ Refreshed VST relay session token.");
      }

      if (attach.ok)
      {
        roleAttached = true;
        roleLockedByMasterRequirement = false;
        roleLockReason.clear();
        if (attach.masterInstanceId.isNotEmpty())
          masterInstanceId = attach.masterInstanceId;
        setStatus(role.toUpperCase() + " attached to Master " + masterInstanceId);
      }
      else
      {
        roleAttached = false;
        roleLockedByMasterRequirement = true;
        roleLockReason = attach.errorMessage.isNotEmpty() ? attach.errorMessage : "master_required";
        setStatus("Locked: " + roleLockReason);
      }
      updateUIForAuthState();
      saveSessionData();
    });
  });
}

void InspireVSTAudioProcessorEditor::heartbeatAndPollMasterState()
{
  if (!isMasterRole() || sessionToken.isEmpty() || currentSyncRoomCode.isEmpty())
    return;

  const auto nowMs = juce::Time::currentTimeMillis();
  const auto serverUrl = serverUrlInput.getText().trim();

  if (nowMs - lastMasterHeartbeatMs >= 5000)
  {
    lastMasterHeartbeatMs = nowMs;
    runAsync([this, serverUrl] {
      juce::String err;
      const bool ok = client.sendMasterHeartbeat(
        serverUrl,
        sessionToken,
        currentSyncRoomCode,
        pluginInstanceID,
        &err
      );
      juce::MessageManager::callAsync([this, ok, err] {
        if (!ok && err.isNotEmpty())
          addErrorLog("[Master] heartbeat failed: " + err);
      });
    });
  }

  if (nowMs - lastMasterStatePollMs >= 5000)
  {
    lastMasterStatePollMs = nowMs;
    runAsync([this, serverUrl] {
      const auto state = client.getMasterRoomState(serverUrl, currentSyncRoomCode, sessionToken);
      juce::MessageManager::callAsync([this, state] {
        if (!state.ok)
          return;
        const juce::String summary = "Master active | Relay: " + juce::String(state.relayCount) +
                                     " | Create: " + juce::String(state.createCount);
        syncStatusIndicator.setText(summary, juce::dontSendNotification);
      });
    });
  }
}

void InspireVSTAudioProcessorEditor::stopSyncPolling()
{
  if (syncPollTimer != nullptr)
  {
    syncPollTimer->stopTimer();
    delete syncPollTimer;
    syncPollTimer = nullptr;
  }
}

void InspireVSTAudioProcessorEditor::pollTrackState()
{
  if (currentSyncRoomCode.isEmpty())
  {
    return;
  }

  if (isMasterRole())
    heartbeatAndPollMasterState();
  else if (isRelayOrCreateRole())
    attemptRoleAttachIfNeeded();
  if (isRelayOrCreateRole() && roleLockedByMasterRequirement)
    return;
  
  const auto serverUrl = serverUrlInput.getText();
  const auto trackId = syncTrackId;
  const int sinceVersion = trackVersions[syncTrackId];
  
  runAsync([this, serverUrl, trackId, sinceVersion] {
    const auto response = client.pullTrackState(
      serverUrl,
      currentSyncRoomCode,
      trackId,
      sinceVersion,
      sessionToken,
      effectivePluginRole(),
      masterInstanceId
    );
    juce::MessageManager::callAsync([this, response] {
      if (response.masterRequired)
      {
        roleLockedByMasterRequirement = true;
        roleAttached = false;
        roleLockReason = response.errorMessage.isNotEmpty() ? response.errorMessage : "master_required";
        updateUIForAuthState();
        attemptRoleAttachIfNeeded();
        return;
      }
      onSyncPullResponse(response);
    });
  });
}

void InspireVSTAudioProcessorEditor::addPackToQueue(const juce::var& pack)
{
  // Minimal queue behavior: log and set status. A fuller queue can be implemented later.
  juce::String title;
  if (pack.isObject())
  {
    if (auto* o = pack.getDynamicObject())
      title = o->getProperty("label").toString();
  }
  addErrorLog("Added pack to queue: " + (title.isEmpty() ? "(unnamed)" : title));
  setStatus("Added pack to queue: " + (title.isEmpty() ? "(unnamed)" : title));
}

void InspireVSTAudioProcessorEditor::insertPackIntoDAW(const juce::var& pack)
{
  // Call into the processor to store the pack; host-specific insertion is handled elsewhere
  processor.insertPackToDAW(pack);
  addErrorLog("Requested insert pack into DAW");
  setStatus("Insert requested");
}

void InspireVSTAudioProcessorEditor::loadPreviewFromUrlAsync(const juce::String& url, int row)
{
  if (url.isEmpty())
  {
    addErrorLog("No preview URL provided");
    return;
  }

  // Stop any current playback
  if (transportSource.isPlaying())
  {
    transportSource.stop();
    playPreviewButton.setButtonText("Play Preview");
  }

  setStatus("Loading preview...");
  addErrorLog("Loading preview (streaming-first): " + url);

  // Run download/stream on thread pool
  runAsync([this, url, row] {
    juce::URL juceUrl(url);

    bool usePost = false;

    // First attempt: streaming-first reader creation (may avoid temp file)
    auto streamOptions = juce::URL::InputStreamOptions(usePost ? juce::URL::ParameterHandling::inPostData : juce::URL::ParameterHandling::inAddress)
      .withConnectionTimeoutMs(30000);
    std::unique_ptr<juce::InputStream> stream(juceUrl.createInputStream(streamOptions));
    if (stream)
    {
      // Try to create an AudioFormatReader directly from the stream on this worker thread
      std::unique_ptr<juce::AudioFormatReader> reader(formatManager.createReaderFor(std::move(stream)));
      if (reader)
      {
        // Transfer raw pointer to message thread; AudioFormatReaderSource will own and delete it
        juce::AudioFormatReader* readerPtr = reader.release();
        juce::MessageManager::callAsync([this, readerPtr, row] () {
          // Clean previous reader
          transportSource.stop();
          transportSource.setSource(nullptr);
          transportReaderSource.reset();

          transportReaderSource.reset(new juce::AudioFormatReaderSource(readerPtr, true));
          transportSource.setSource(transportReaderSource.get(), 0, nullptr, transportReaderSource->getAudioFormatReader()->sampleRate);
          lastPreviewFile = juce::File(); // no temp file used

          // Start playback
          transportSource.setPosition(0.0);
          transportSource.start();
          playPreviewButton.setButtonText("Stop Preview");
          setStatus("Playing preview (stream)");
          addErrorLog("Playing preview from stream");

          if (row >= 0)
          {
            if (auto* comp = packList.getComponentForRowNumber(row))
              if (auto* card = dynamic_cast<PackCard*>(comp))
              {
                card->setProgress(1.0);
                card->setLoading(false);
                card->repaint();
              }
          }
        });
        return; // streaming succeeded
      }
      else
      {
        // Could not create reader from stream; log and fall back to full download
        addErrorLog("Streaming reader unsupported for URL, falling back to temp file: " + url);
      }
    }

    // Fallback: download to reusable temp file with progress
    juce::File temp = previewTempFile;
    if (temp.exists())
    {
      // reuse the same file by overwriting
      temp.deleteFile();
    }
    temp = temp.getNonexistentSibling();

    auto downloadOptions = juce::URL::InputStreamOptions(usePost ? juce::URL::ParameterHandling::inPostData : juce::URL::ParameterHandling::inAddress)
      .withConnectionTimeoutMs(30000);
    std::unique_ptr<juce::InputStream> in2(juceUrl.createInputStream(downloadOptions));
    if (!in2)
    {
      juce::MessageManager::callAsync([this, url, row] {
        addErrorLog("Failed to create input stream for fallback download: " + url);
        setStatus("Preview load failed");
        if (row >= 0)
        {
          if (auto* comp = packList.getComponentForRowNumber(row))
            if (auto* card = dynamic_cast<PackCard*>(comp)) card->setLoading(false);
        }
      });
      return;
    }

    int64_t totalLen = in2->getTotalLength();
    bool haveTotal = totalLen > 0;

    juce::FileOutputStream out(temp);
    if (!out.openedOk())
    {
      juce::MessageManager::callAsync([this] {
        addErrorLog("Failed to open temp file for preview");
        setStatus("Preview load failed");
      });
      return;
    }

    const int bufferSize = 16384;
    std::vector<char> buffer(bufferSize);
    int64_t downloaded = 0;
    while (!in2->isExhausted())
    {
      int64_t n = in2->read(buffer.data(), bufferSize);
      if (n <= 0)
        break;
      out.write(buffer.data(), (int)n);
      downloaded += n;

      if (haveTotal && row >= 0)
      {
        double progress = juce::jlimit(0.0, 1.0, (double)downloaded / (double)totalLen);
        juce::MessageManager::callAsync([this, row, progress] {
          if (auto* comp = packList.getComponentForRowNumber(row))
            if (auto* card = dynamic_cast<PackCard*>(comp))
            {
              card->setProgress(progress);
              card->repaint();
            }
        });
      }
    }
    out.flush();

    // Now create reader from temp on message thread and play
    juce::MessageManager::callAsync([this, temp, row] {
      transportSource.stop();
      transportSource.setSource(nullptr);
      transportReaderSource.reset();

      std::unique_ptr<juce::AudioFormatReader> reader(formatManager.createReaderFor(temp));
      if (!reader)
      {
        addErrorLog("AudioFormatReader creation failed for preview file");
        setStatus("Preview load failed");
        if (row >= 0)
        {
          if (auto* comp = packList.getComponentForRowNumber(row))
            if (auto* card = dynamic_cast<PackCard*>(comp)) card->setLoading(false);
        }
        return;
      }

      transportReaderSource.reset(new juce::AudioFormatReaderSource(reader.release(), true));
      transportSource.setSource(transportReaderSource.get(), 0, nullptr, transportReaderSource->getAudioFormatReader()->sampleRate);
      lastPreviewFile = temp;

      transportSource.setPosition(0.0);
      transportSource.start();
      playPreviewButton.setButtonText("Stop Preview");
      setStatus("Playing preview");
      addErrorLog("Playing preview from temp file: " + temp.getFullPathName());

      if (row >= 0)
      {
        if (auto* comp = packList.getComponentForRowNumber(row))
          if (auto* card = dynamic_cast<PackCard*>(comp))
          {
            card->setProgress(1.0);
            card->setLoading(false);
            card->repaint();
          }
      }
    });
  });
}

void InspireVSTAudioProcessorEditor::onSyncPullResponse(const DAWSyncPullResponse& response)
{
  if (!response.hasState)
  {
    return;
  }
  
  lastSyncAtMs = juce::Time::currentTimeMillis();
  
  // Update sync status with timestamp
  auto now = juce::Time::getCurrentTime();
  juce::String timeStr = now.toString(true, true);  // "HH:MM:SS"
  syncStatusLabel.setText("Sync: " + timeStr, juce::dontSendNotification);
  
  // Update track version
  trackVersions.set(syncTrackId, response.version);
  appendUpdateEvent("poll",
                    response.state.pluginInstanceId.isNotEmpty() ? response.state.pluginInstanceId : response.state.updatedBy,
                    response.version,
                    response.state.currentBeat,
                    "Background sync pull: " + response.trackId);
  
  // In a full implementation, would apply state changes to track
  // For now, just log that we received sync data
}

void InspireVSTAudioProcessorEditor::showSyncConflictAlert(const juce::String& trackId,
                                                         const DAWSyncPullResponse& serverState)
{
  // In a simple implementation, would show an alert dialog
  // For now, just log the conflict
  showingSyncConflict = true;
  conflictTrackId = trackId;
  lastConflictResponse = serverState;
}

void InspireVSTAudioProcessorEditor::addErrorLog(const juce::String& message)
{
  // Add timestamp to log entry
  auto now = juce::Time::getCurrentTime();
  juce::String timeStr = now.toString(true, true);  // "HH:MM:SS"
  juce::String logEntry = "[" + timeStr + "] " + message;
  
  // Add to log array
  errorLogs.insert(0, logEntry);  // Insert at beginning (newest first)
  
  // Trim to max entries
  if (errorLogs.size() > MAX_ERROR_LOGS)
  {
    errorLogs.remove(errorLogs.size() - 1);  // Remove oldest (last) entry
  }
  
  // Also log to console for debugging
  juce::Logger::getCurrentLogger()->writeToLog("[Inspire VST] " + logEntry);
}

void InspireVSTAudioProcessorEditor::showErrorLogs()
{
  // Create alert window with logs
  juce::String logsText;
  if (errorLogs.isEmpty())
  {
    logsText = "No errors logged yet.";
  }
  else
  {
    logsText = errorLogs.joinIntoString("\n");
  }
  
  // Create simple alert dialog
  juce::AlertWindow::showMessageBoxAsync(
    juce::AlertWindow::InfoIcon,
    "Inspire VST - Error Logs",
    logsText,
    "Close"
  );
}

bool InspireVSTAudioProcessorEditor::isSessionExpired() const
{
  if (!isGuest || lastServerTimeMs <= 0)
    return false;
    
  juce::int64 now = juce::Time::currentTimeMillis();
  juce::int64 elapsed = (now - lastServerTimeMs) / 1000; // seconds
  juce::int64 remaining = 900 - elapsed; // 15 mins = 900 seconds
  
  return remaining <= 0;
}

int InspireVSTAudioProcessorEditor::getRemainingMinutes() const
{
  if (!isGuest || lastServerTimeMs <= 0)
    return -1; // unlimited
    
  juce::int64 now = juce::Time::currentTimeMillis();
  juce::int64 elapsed = (now - lastServerTimeMs) / 1000; // seconds
  juce::int64 remaining = 900 - elapsed; // 15 mins = 900 seconds
  
  if (remaining <= 0)
    return 0;
    
  return static_cast<int>(remaining / 60);
}

void InspireVSTAudioProcessorEditor::selectWriterLab()
{
  if (effectivePluginRole() != "create")
  {
    setStatus("Writer Lab is only available while Plugin Role is CREATE.");
    return;
  }

  selectedMode = "writer";
  currentUIState = UIState::InitialView;
  generatedPackItems.clear();
  currentDisplayedPack = juce::var();
  selectedSubmodeId.clear();
  clearPackCardButtons();
  addErrorLog("Selected mode: Writer Lab");
  
  // Update button colors to show selection
  writerLabCard.setColour(juce::TextButton::buttonColourId, juce::Colour(236, 72, 153).withAlpha(1.0f));
  producerLabCard.setColour(juce::TextButton::buttonColourId, juce::Colour(34, 211, 238).withAlpha(0.7f));
  editorSuiteCard.setColour(juce::TextButton::buttonColourId, juce::Colour(168, 85, 247).withAlpha(0.7f));
  
  updateUIForAuthState();  // Show push/pull buttons

  // Fetch mode definitions from backend and populate interactive pack list
  // Set header title / back button
  modeTitleLabel.setText("Writer Lab", juce::dontSendNotification);
  modeTitleLabel.setVisible(true);
  backButton.setVisible(true);

  setStatus("Loading Writer Lab packs...");
  const auto serverUrl = serverUrlInput.getText();
  runAsync([this, serverUrl] {
    const juce::String response = client.getModeDefinitions(serverUrl, sessionToken);
    packItems.clear();
    if (!response.isEmpty())
    {
      auto parsed = juce::JSON::parse(response);
      if (parsed.isArray())
      {
        for (const auto& item : *parsed.getArray())
        {
          if (!item.isObject())
            continue;
          if (auto* obj = item.getDynamicObject())
          {
            juce::String id = obj->getProperty("id").toString();
            if (id == "lyricist" || obj->getProperty("label").toString().equalsIgnoreCase("Writer Lab"))
            {
              auto submodesVar = obj->getProperty("submodes");
              if (submodesVar.isArray())
              {
                for (const auto& sm : *submodesVar.getArray())
                {
                  packItems.add(sm);
                }
              }
              break;
            }
          }
        }
      }
      else if (parsed.isObject())
      {
        if (auto* obj = parsed.getDynamicObject())
        {
          auto modesVar = obj->getProperty("modes");
          if (modesVar.isArray())
          {
            for (const auto& m : *modesVar.getArray())
            {
              if (!m.isObject())
                continue;
              if (auto* mObj = m.getDynamicObject())
              {
                if (mObj->getProperty("id").toString() == "lyricist")
                {
                  auto submodesVar = mObj->getProperty("submodes");
                  if (submodesVar.isArray())
                  {
                    for (const auto& sm : *submodesVar.getArray())
                    {
                      packItems.add(sm);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    juce::MessageManager::callAsync([this] {
      if (packItems.size() > 0)
      {
        auto& first = packItems.getReference(0);
        if (first.isObject())
        {
          if (auto* o = first.getDynamicObject())
            selectedSubmodeId = o->getProperty("id").toString();
        }
      }
      pushLogLabel.setText("Writer Lab Packs", juce::dontSendNotification);
      packList.updateContent();
      packList.repaint();
      setStatus("Writer Lab packs loaded");
    });
  });
}

void InspireVSTAudioProcessorEditor::selectProducerLab()
{
  if (effectivePluginRole() != "create")
  {
    setStatus("Producer Lab is only available while Plugin Role is CREATE.");
    return;
  }

  selectedMode = "producer";
  currentUIState = UIState::InitialView;
  generatedPackItems.clear();
  currentDisplayedPack = juce::var();
  selectedSubmodeId.clear();
  clearPackCardButtons();
  addErrorLog("Selected mode: Producer Lab");
  
  // Update button colors to show selection
  writerLabCard.setColour(juce::TextButton::buttonColourId, juce::Colour(236, 72, 153).withAlpha(0.7f));
  producerLabCard.setColour(juce::TextButton::buttonColourId, juce::Colour(34, 211, 238).withAlpha(1.0f));
  editorSuiteCard.setColour(juce::TextButton::buttonColourId, juce::Colour(168, 85, 247).withAlpha(0.7f));
  
  updateUIForAuthState();  // Show push/pull buttons
  // Set header title / back button
  modeTitleLabel.setText("Producer Lab", juce::dontSendNotification);
  modeTitleLabel.setVisible(true);
  backButton.setVisible(true);

  // Fetch mode definitions from backend and populate interactive pack list for Producer
  setStatus("Loading Producer Lab packs...");
  const auto serverUrl = serverUrlInput.getText();
  runAsync([this, serverUrl] {
    const juce::String response = client.getModeDefinitions(serverUrl, sessionToken);
    packItems.clear();
    if (!response.isEmpty())
    {
      auto parsed = juce::JSON::parse(response);
      if (parsed.isArray())
      {
        for (const auto& item : *parsed.getArray())
        {
          if (!item.isObject())
            continue;
          if (auto* obj = item.getDynamicObject())
          {
            juce::String id = obj->getProperty("id").toString();
            juce::String label = obj->getProperty("label").toString();
            if (id == "producer" || label.containsIgnoreCase("Producer"))
            {
              auto submodesVar = obj->getProperty("submodes");
              if (submodesVar.isArray())
              {
                for (const auto& sm : *submodesVar.getArray())
                {
                  packItems.add(sm);
                }
              }
              break;
            }
          }
        }
      }
    }

    juce::MessageManager::callAsync([this] {
      if (packItems.size() > 0)
      {
        auto& first = packItems.getReference(0);
        if (first.isObject())
        {
          if (auto* o = first.getDynamicObject())
            selectedSubmodeId = o->getProperty("id").toString();
        }
      }
      pushLogLabel.setText("Producer Lab Packs", juce::dontSendNotification);
      packList.updateContent();
      packList.repaint();
      setStatus("Producer Lab packs loaded");
    });
  });
}

void InspireVSTAudioProcessorEditor::selectEditorSuite()
{
  if (effectivePluginRole() != "create")
  {
    setStatus("Editor Suite is only available while Plugin Role is CREATE.");
    return;
  }

  selectedMode = "editor";
  currentUIState = UIState::InitialView;
  generatedPackItems.clear();
  currentDisplayedPack = juce::var();
  selectedSubmodeId.clear();
  clearPackCardButtons();
  addErrorLog("Selected mode: Editor Suite");
  
  // Update button colors to show selection
  writerLabCard.setColour(juce::TextButton::buttonColourId, juce::Colour(236, 72, 153).withAlpha(0.7f));
  producerLabCard.setColour(juce::TextButton::buttonColourId, juce::Colour(34, 211, 238).withAlpha(0.7f));
  editorSuiteCard.setColour(juce::TextButton::buttonColourId, juce::Colour(168, 85, 247).withAlpha(1.0f));
  
  updateUIForAuthState();  // Show push/pull buttons
  // Set header title / back button
  modeTitleLabel.setText("Editor Suite", juce::dontSendNotification);
  modeTitleLabel.setVisible(true);
  backButton.setVisible(true);

  // Fetch mode definitions from backend and populate interactive pack list for Editor Suite
  setStatus("Loading Editor Suite packs...");
  const auto serverUrl = serverUrlInput.getText();
  runAsync([this, serverUrl] {
    const juce::String response = client.getModeDefinitions(serverUrl, sessionToken);
    packItems.clear();
    if (!response.isEmpty())
    {
      auto parsed = juce::JSON::parse(response);
      if (parsed.isArray())
      {
        for (const auto& item : *parsed.getArray())
        {
          if (!item.isObject())
            continue;
          if (auto* obj = item.getDynamicObject())
          {
            juce::String id = obj->getProperty("id").toString();
            juce::String label = obj->getProperty("label").toString();
            if (id == "editor" || label.containsIgnoreCase("Editor"))
            {
              auto submodesVar = obj->getProperty("submodes");
              if (submodesVar.isArray())
              {
                for (const auto& sm : *submodesVar.getArray())
                {
                  packItems.add(sm);
                }
              }
              break;
            }
          }
        }
      }
    }

    juce::MessageManager::callAsync([this] {
      if (packItems.size() > 0)
      {
        auto& first = packItems.getReference(0);
        if (first.isObject())
        {
          if (auto* o = first.getDynamicObject())
            selectedSubmodeId = o->getProperty("id").toString();
        }
      }
      pushLogLabel.setText("Editor Suite Packs", juce::dontSendNotification);
      packList.updateContent();
      packList.repaint();
      setStatus("Editor Suite packs loaded");
    });
  });
}

void InspireVSTAudioProcessorEditor::selectUpdates()
{
  if (!inRoom)
  {
    if (isRelayOrCreateRole())
    {
      addErrorLog("Updates requested while out of room; opening attach dialog.");
      setStatus("Enter room code and password to attach to Master.");
      startJoin();
    }
    else
    {
      addErrorLog("Project requested while out of room.");
      setStatus("Create or join a room before opening Project.");
    }

    selectedMode = "";
    modeTitleLabel.setText("", juce::dontSendNotification);
    modeTitleLabel.setVisible(false);
    backButton.setVisible(false);
    updateUIForAuthState();
    return;
  }

  const auto modeLabel = isMasterRole() ? juce::String("Project") : juce::String("Updates");
  selectedMode = "updates";
  addErrorLog("Selected mode: " + modeLabel);
  modeTitleLabel.setText(modeLabel, juce::dontSendNotification);
  modeTitleLabel.setVisible(true);
  backButton.setVisible(true);
  // Add push/pull and updates UI when entering Updates mode
  if (pushTrackButton.getParentComponent() == nullptr)
    addAndMakeVisible(pushTrackButton);
  if (pullTrackButton.getParentComponent() == nullptr)
    addAndMakeVisible(pullTrackButton);
  if (attachArtifactButton.getParentComponent() == nullptr)
    addAndMakeVisible(attachArtifactButton);
  if (pushLogDisplay.getParentComponent() == nullptr)
    addAndMakeVisible(pushLogDisplay);
  if (pushLogLabel.getParentComponent() == nullptr)
    addAndMakeVisible(pushLogLabel);

  pushLogLabel.setText(modeLabel, juce::dontSendNotification);
  pushLogDisplay.setReadOnly(true);
  destinationInstanceValue.setText("This instance " + shortInstanceId(pluginInstanceID), juce::dontSendNotification);
  refreshRecordReadyBanner();

  // Phase 1: VST Instance Broadcasting - Show instances list
  if (instancesListLabel.getParentComponent() == nullptr)
    addAndMakeVisible(instancesListLabel);
  if (instancesDisplay.getParentComponent() == nullptr)
    addAndMakeVisible(instancesDisplay);
  if (syncStatusIndicator.getParentComponent() == nullptr)
    addAndMakeVisible(syncStatusIndicator);
  
  // Phase 3: Try WebSocket first, fall back to polling
  refreshInstancesList();
  refreshTransferSelectionOptions();
  refreshSyncStatus();
  fetchCollabVisualizationForUpdates(false);
  if (isRelayOrCreateRole())
    attemptRoleAttachIfNeeded();
  startWebSocketSync();  // Phase 3: Try WebSocket connection

  refreshUpdatesDisplay();
  updateUIForAuthState();
}

void InspireVSTAudioProcessorEditor::refreshRecordReadyBanner()
{
  const auto hostInfo = processor.getHostTransportInfo();
  const bool transportRunning = hostInfo.isPlaying;
  const bool midiOutputActive = processor.producesMidi();
  const bool readyToCapture = transportRunning && midiOutputActive;

  juce::String text;
  text << "Status: " << (readyToCapture ? "Ready to capture" : "Needs attention") << "\n";
  text << "Transport: " << (transportRunning ? "Running" : "Stopped") << "\n";
  text << "Destination track armed: verify in host (AU/VST3 host-controlled)\n";
  text << "Plugin MIDI output: " << (midiOutputActive ? "Active" : "Unavailable");

  recordReadyDisplay.setText(text, false);
  recordReadyDisplay.setColour(
    juce::TextEditor::outlineColourId,
    (readyToCapture ? juce::Colour(16, 185, 129) : juce::Colour(251, 191, 36)).withAlpha(0.55f));
}

void InspireVSTAudioProcessorEditor::selectSearch()
{
  selectedMode = "search";
  addErrorLog("Selected mode: Search");
  modeTitleLabel.setText("Search", juce::dontSendNotification);
  modeTitleLabel.setVisible(true);
  backButton.setVisible(true);

  setStatus("Loading public projects...");
  const auto serverUrl = serverUrlInput.getText();
  runAsync([this, serverUrl] {
    const auto response = client.getCommunityFeed(serverUrl, sessionToken);
    packItems.clear();
    if (!response.isEmpty())
    {
      auto parsed = juce::JSON::parse(response);
      if (parsed.isArray())
      {
        for (const auto& item : *parsed.getArray())
        {
          packItems.add(item);
        }
      }
      else if (parsed.isObject())
      {
        // maybe wrapped
        if (auto* obj = parsed.getDynamicObject())
        {
          auto feed = obj->getProperty("items");
          if (feed.isArray())
          {
            for (const auto& it : *feed.getArray())
              packItems.add(it);
          }
        }
      }
    }

    juce::MessageManager::callAsync([this] {
      pushLogLabel.setText("Search Results", juce::dontSendNotification);
      packList.updateContent();
      packList.repaint();
      setStatus("Search results loaded");
      updateUIForAuthState();
    });
  });
}

void InspireVSTAudioProcessorEditor::pushTrack()
{
  if (busy || currentSyncRoomCode.isEmpty())
  {
    return;
  }
  if (isRelayOrCreateRole() && roleLockedByMasterRequirement)
  {
    setLastTransferReceipt(
      "Status: Push blocked (locked)\n"
      "Reason: " + (roleLockReason.isNotEmpty() ? roleLockReason : juce::String("master_required")) + "\n"
      "Source: This instance " + shortInstanceId(pluginInstanceID) + "\n"
      "Action: Attach to active master, then retry push."
    );
    setStatus("Locked: " + (roleLockReason.isNotEmpty() ? roleLockReason : juce::String("master_required")));
    attemptRoleAttachIfNeeded();
    return;
  }
  
  setBusy(true);
  addErrorLog("Pushing track to room...");
  
  const auto serverUrl = serverUrlInput.getText();
  
  runAsync([this, serverUrl] {
    // Construct DAWTrackState object, prefer host transport info when available
    DAWTrackState state;
    state.roomCode = currentSyncRoomCode;
    state.trackId = syncTrackId;
    state.trackIndex = 0;
    state.trackName = "Inspire VST Track";
    state.updatedAt = juce::Time::currentTimeMillis();
    state.updatedBy = authUsername;
    // Try to use host transport snapshot for accurate beat/time
    auto hostInfo = processor.getHostTransportInfo();
    state.bpm = static_cast<float>(hostInfo.bpm);
    state.timeSignature = juce::String(hostInfo.timeSigNumerator) + "/" + juce::String(hostInfo.timeSigDenominator);
    // compute beat-in-bar from ppqPosition (ppqPosition is quarter-note based)
    if (hostInfo.timeSigNumerator > 0)
    {
      double ppq = hostInfo.ppqPosition;
      double beatsPerBar = static_cast<double>(hostInfo.timeSigNumerator);
      double mod = std::fmod(ppq, beatsPerBar);
      double beatInBar = (mod < 0.0) ? 0.0 : (mod + 1.0); // convert 0-based to 1-based
      state.currentBeat = static_cast<int>(std::round(beatInBar));
    }
    else
    {
      state.currentBeat = 0;
    }
    
    // Serialize a minimal clip snapshot for receipt-friendly sync metadata.
    state.clipsJson = "[{"
              "\"id\":\"" + syncTrackId + "-clip\","
              "\"trackId\":\"" + syncTrackId + "\","
              "\"type\":\"midi\","
              "\"startBeat\":" + juce::String(juce::jmax(0, state.currentBeat - 1)) + ","
              "\"durationBeats\":4"
              "}]";
    state.notesJson = "[]";
    
    // Phase 1: VST Instance Broadcasting - add plugin instance info
    state.pluginInstanceId = pluginInstanceID;
    // DAW track info extraction is host-dependent and may be unavailable in many hosts.
    // Use "unknown" defaults so server-side relay-per-track checks only apply to real data.
    state.dawTrackIndex = -1;
    state.dawTrackName.clear();
    
    const int baseVersion = trackVersions[syncTrackId];
    const int beatForLog = state.currentBeat;
    const int pushedClipCount = countJsonArrayItems(state.clipsJson);
    const int pushedNoteCount = countJsonArrayItems(state.notesJson);
    const float pushedBpm = state.bpm;
    const auto response = client.pushTrackState(
      serverUrl,
      state,
      baseVersion,
      sessionToken,
      effectivePluginRole(),
      masterInstanceId
    );
    juce::MessageManager::callAsync([this, response, beatForLog, pushedClipCount, pushedNoteCount, pushedBpm, serverUrl] {
      if (response.ok)
      {
        roleLockedByMasterRequirement = false;
        roleLockReason.clear();
        auto now = juce::Time::getCurrentTime();
        juce::String logEntry = "[" + now.toString(true, true) + "] Pushed track (" + selectedMode + " mode)";
        pushLog.insert(0, logEntry);

        // Also add structured update entry with instance id and beat (prefer host-derived)
        appendUpdateEvent("push",
                          pluginInstanceID,
                          response.version,
                          beatForLog,
                          "Pushed track (" + selectedMode + ")");
        
        // Trim log to max 20 entries
        if (pushLog.size() > 20)
        {
          pushLog.remove(pushLog.size() - 1);
        }
        
        // Update display
        pushLogDisplay.setText(pushLog.joinIntoString("\n"), false);
        trackVersions.set(syncTrackId, response.version);

        if (wsClient && wsClient->isConnected())
        {
          juce::DynamicObject::Ptr pushMsg = new juce::DynamicObject();
          const auto role = effectivePluginRole();
          const auto resolvedMasterId = masterInstanceId.isNotEmpty() ? masterInstanceId : pluginInstanceID;
          pushMsg->setProperty("type", "track-pushed");
          pushMsg->setProperty("pluginInstanceId", pluginInstanceID);
          pushMsg->setProperty("roomCode", currentSyncRoomCode);
          pushMsg->setProperty("pluginRole", role);
          pushMsg->setProperty("masterInstanceId", resolvedMasterId);
          pushMsg->setProperty("version", response.version);
          pushMsg->setProperty("timestamp", juce::Time::currentTimeMillis());
          wsClient->sendMessage(juce::JSON::toString(juce::var(pushMsg.get())));
        }

        addErrorLog("✓ Track pushed successfully");
        const juce::String receipt = "Push complete: "
          "" + juce::String(pushedClipCount) + " clip(s), " + juce::String(pushedNoteCount) + " note(s), "
          "source This Instance " + shortInstanceId(pluginInstanceID) + ", "
          "tempo " + juce::String(pushedBpm, 1) + " BPM, beat " + juce::String(beatForLog) + ".";
        addErrorLog(receipt);
        setLastTransferReceipt(
          "Status: Push succeeded\n"
          "Source: This instance " + shortInstanceId(pluginInstanceID) + "\n"
          "Destination: Room " + currentSyncRoomCode + " (server sync state)\n"
          "Details: " + juce::String(pushedClipCount) + " clip(s), " + juce::String(pushedNoteCount) + " note(s), "
          + juce::String(pushedBpm, 1) + " BPM, beat " + juce::String(beatForLog) + "\n"
          "Version: v" + juce::String(response.version) + "\n"
          "Placement: Host-dependent (AU/VST3); manual region placement may be required."
        );
        setStatus("Push complete to room " + currentSyncRoomCode + " (v" + juce::String(response.version) + ")");
        refreshInstancesList();
        refreshSyncStatus();
        fetchCollabVisualizationForUpdates(true);

        if (pendingArtifactFile.existsAsFile())
        {
          if (response.eventId.isEmpty())
          {
            addErrorLog("⚠ Track push succeeded but event ID missing; artifact upload skipped");
          }
          else
          {
            addErrorLog("Uploading artifact: " + pendingArtifactFile.getFileName());
            const auto uploadResult = client.uploadCollabAssetChunked(
              serverUrl,
              currentSyncRoomCode,
              sessionToken,
              response.eventId,
              syncTrackId,
              pendingArtifactFile,
              pendingArtifactMimeType,
              0.0,
              256 * 1024
            );

            if (uploadResult.ok)
            {
              addErrorLog("✓ Artifact uploaded: " + pendingArtifactFile.getFileName());
              appendUpdateEvent("artifact",
                                pluginInstanceID,
                                response.version,
                                beatForLog,
                                "Uploaded " + pendingArtifactFile.getFileName());
              pendingArtifactFile = juce::File();
              pendingArtifactMimeType.clear();
            }
            else
            {
              addErrorLog("✗ Artifact upload failed: " + uploadResult.errorMessage);
            }
          }
        }
      }
      else
      {
        if (response.masterRequired)
        {
          roleLockedByMasterRequirement = true;
          roleAttached = false;
          roleLockReason = response.conflictReason.isNotEmpty() ? response.conflictReason : "master_required";
          addErrorLog("✗ Track push locked: " + roleLockReason);
          setLastTransferReceipt(
            "Status: Push failed (locked)\n"
            "Reason: " + roleLockReason + "\n"
            "Source: This instance " + shortInstanceId(pluginInstanceID) + "\n"
            "Action: Attach to active master, then retry push."
          );
          setStatus("Locked: " + roleLockReason);
          attemptRoleAttachIfNeeded();
          setBusy(false);
          updateUIForAuthState();
          return;
        }
        if (response.conflict)
        {
          addErrorLog("✗ Track push failed: conflict - " + response.conflictReason);
          setLastTransferReceipt(
            "Status: Push failed (version conflict)\n"
            "Reason: " + response.conflictReason + "\n"
            "Source: This instance " + shortInstanceId(pluginInstanceID) + "\n"
            "Action: Pull latest changes first, then push again."
          );
          setStatus("Push conflict: " + response.conflictReason);
        }
        else
        {
          const juce::String failureReason = response.conflictReason.isNotEmpty()
            ? response.conflictReason
            : juce::String("unknown_error");
          addErrorLog("✗ Track push failed: " + failureReason);

          if (isAuthTokenFailureMessage(failureReason))
          {
            roleAttached = false;
            setStatus("Session expired. Click Login and retry.");
          }
          else
          {
            setStatus("Track push failed: " + failureReason);
          }

          setLastTransferReceipt(
            "Status: Push failed\n"
            "Reason: " + failureReason + "\n"
            "Source: This instance " + shortInstanceId(pluginInstanceID) + "\n"
            "Action: Check connection and room role, then retry."
          );
        }
      }
      setBusy(false);
    });
  });
}

void InspireVSTAudioProcessorEditor::pullTrack()
{
  if (busy || currentSyncRoomCode.isEmpty())
  {
    return;
  }
  if (isRelayOrCreateRole() && roleLockedByMasterRequirement)
  {
    setLastTransferReceipt(
      "Status: Pull blocked (locked)\n"
      "Reason: " + (roleLockReason.isNotEmpty() ? roleLockReason : juce::String("master_required")) + "\n"
      "Destination: This instance " + shortInstanceId(pluginInstanceID) + "\n"
      "Action: Attach to active master, then retry pull."
    );
    setStatus("Locked: " + (roleLockReason.isNotEmpty() ? roleLockReason : juce::String("master_required")));
    attemptRoleAttachIfNeeded();
    return;
  }

  if (selectedSourceTrackId.isEmpty())
  {
    setLastTransferReceipt(
      "Status: Pull blocked\n"
      "Reason: No source selected\n"
      "Action: Choose a source instance, then retry pull."
    );
    setStatus("Select a source instance before pulling.");
    return;
  }

  refreshRecordReadyBanner();
  
  setBusy(true);
  addErrorLog("Pulling track from room...");
  
  const auto serverUrl = serverUrlInput.getText();
  const auto trackId = selectedSourceTrackId;
  const auto sourceInstanceId = selectedSourceInstanceId;
  const int sinceVersion = trackVersions[syncTrackId];
  
  runAsync([this, serverUrl, trackId, sourceInstanceId, sinceVersion] {
    const auto response = client.pullTrackState(
      serverUrl,
      currentSyncRoomCode,
      trackId,
      sinceVersion,
      sessionToken,
      effectivePluginRole(),
      masterInstanceId
    );
    juce::MessageManager::callAsync([this, response, sourceInstanceId] {
      if (response.masterRequired)
      {
        roleLockedByMasterRequirement = true;
        roleAttached = false;
        roleLockReason = response.errorMessage.isNotEmpty() ? response.errorMessage : "master_required";
        addErrorLog("✗ Pull locked: " + roleLockReason);
        setLastTransferReceipt(
          "Status: Pull failed (locked)\n"
          "Reason: " + roleLockReason + "\n"
          "Destination: This instance " + shortInstanceId(pluginInstanceID) + "\n"
          "Action: Attach to active master, then retry pull."
        );
        setStatus("Locked: " + roleLockReason);
        updateUIForAuthState();
        setBusy(false);
        attemptRoleAttachIfNeeded();
        return;
      }

      roleLockedByMasterRequirement = false;
      if (response.masterRequired == false && response.errorMessage.isEmpty())
        roleLockReason.clear();

      if (response.hasState)
      {
        const int clipCount = countJsonArrayItems(response.state.clipsJson);
        const int noteCount = countJsonArrayItems(response.state.notesJson);
        juce::String sourceTrack = response.state.dawTrackName;
        if (sourceTrack.isEmpty())
          sourceTrack = response.state.trackName;
        if (sourceTrack.isEmpty())
          sourceTrack = response.trackId;
        juce::String sourceActor = response.state.updatedBy;
        if (sourceActor.isEmpty())
          sourceActor = response.state.pluginInstanceId;
        if (sourceActor.isEmpty())
          sourceActor = sourceInstanceId;
        if (sourceActor.isEmpty())
          sourceActor = "unknown source";

        auto now = juce::Time::getCurrentTime();
        juce::String logEntry = "[" + now.toString(true, true) + "] Pulled track (version " + 
                               juce::String(response.version) + ")";
        pushLog.insert(0, logEntry);

        juce::DynamicObject::Ptr pulledSnapshot = new juce::DynamicObject();
        pulledSnapshot->setProperty("type", "daw-sync-pull");
        pulledSnapshot->setProperty("trackId", response.trackId);
        pulledSnapshot->setProperty("version", response.version);
        pulledSnapshot->setProperty("sourceTrack", sourceTrack);
        pulledSnapshot->setProperty("sourceActor", sourceActor);
        pulledSnapshot->setProperty("bpm", response.state.bpm);
        pulledSnapshot->setProperty("timeSignature", response.state.timeSignature);
        pulledSnapshot->setProperty("noteCount", noteCount);
        pulledSnapshot->setProperty("clipCount", clipCount);
        pulledSnapshot->setProperty("notesJson", response.state.notesJson);
        processor.insertPackToDAW(juce::var(pulledSnapshot.get()));

        downloadPulledAssetsAsync(currentSyncRoomCode, response.trackId, response.version);

        const juce::String receipt = "Pull complete: "
          "" + juce::String(clipCount) + " clip(s), " + juce::String(noteCount) + " note(s), "
          "from " + sourceTrack + " by " + sourceActor + ", "
          "to This Instance " + shortInstanceId(pluginInstanceID) + ". "
          "Placement is sync snapshot only; host behavior varies in AU/VST3 and may require manual region placement.";
        addErrorLog(receipt);
        setLastTransferReceipt(
          "Status: Pull succeeded\n"
          "Source: " + sourceTrack + " (" + sourceActor + ")\n"
          "Destination: This instance " + shortInstanceId(pluginInstanceID) + "\n"
          "Details: " + juce::String(clipCount) + " clip(s), " + juce::String(noteCount) + " note(s), "
          + juce::String(response.state.bpm, 1) + " BPM, " + response.state.timeSignature + "\n"
          "MIDI Writeback: queued to plugin MIDI output (arm+record destination track to capture visible regions)\n"
          "Version: v" + juce::String(response.version) + "\n"
          "Placement: Sync snapshot only; AU/VST3 host behavior may require manual MIDI region placement."
        );

        // Add structured update for pull
        juce::String pulledBy = response.state.updatedBy.isEmpty() ? juce::String("unknown") : response.state.updatedBy;
        appendUpdateEvent("pull",
              response.state.pluginInstanceId.isNotEmpty() ? response.state.pluginInstanceId : pulledBy,
              response.version,
              response.state.currentBeat,
              "Pulled " + response.trackId + " bpm=" + juce::String(response.state.bpm, 1) + " sig=" + response.state.timeSignature);
        
        // Trim log to max 20 entries
        if (pushLog.size() > 20)
        {
          pushLog.remove(pushLog.size() - 1);
        }
        
        // Update display
        pushLogDisplay.setText(pushLog.joinIntoString("\n"), false);
        trackVersions.set(syncTrackId, response.version);
        addErrorLog("✓ Track pulled successfully");
        setStatus("Pull complete from " + sourceTrack + " (v" + juce::String(response.version) + ")");
        refreshInstancesList();
        refreshSyncStatus();
        fetchCollabVisualizationForUpdates(true);
      }
      else
      {
        if (response.errorMessage.isNotEmpty())
        {
          addErrorLog("✗ Pull failed: " + response.errorMessage);
          if (isAuthTokenFailureMessage(response.errorMessage))
          {
            roleAttached = false;
            setStatus("Session expired. Click Login and retry.");
          }
          else
          {
            setStatus("Pull failed: " + response.errorMessage);
          }

          setLastTransferReceipt(
            "Status: Pull failed\n"
            "Reason: " + response.errorMessage + "\n"
            "Destination: This instance " + shortInstanceId(pluginInstanceID) + "\n"
            "Action: Check room/session state, then retry."
          );
          setBusy(false);
          return;
        }

        addErrorLog("✗ No new track state to pull");
        setLastTransferReceipt(
          "Status: Pull finished (no new changes)\n"
          "Source: " + (sourceInstanceId.isNotEmpty() ? shortInstanceId(sourceInstanceId) : juce::String("selected instance")) + "\n"
          "Destination: This instance " + shortInstanceId(pluginInstanceID) + "\n"
          "Action: Wait for another collaborator push, then pull again."
        );
        setStatus("No new track state available.");
        refreshSyncStatus();
      }
      setBusy(false);
    });
  });
}

void InspireVSTAudioProcessorEditor::showFilterDialog()
{
  if (!filterDialog)
  {
    filterDialog = std::make_unique<FilterDialogComponent>();
  }

  // For now, just call generate with defaults
  generatePackForSelection();
}

void InspireVSTAudioProcessorEditor::showInspirationQueueDialog(const juce::var& pack)
{
  if (!inspirationQueueDialog)
  {
    inspirationQueueDialog = std::make_unique<InspirationQueueDialog>();
  }

  inspirationQueueDialog->setItems(pack);
}

void InspireVSTAudioProcessorEditor::onFilterButtonClicked(juce::TextButton* button, const juce::String& filterType, const juce::String& value)
{
  // Update selection tracking
  if (filterType == "timeframe")
  {
    selectedTimeframe = value;
    filterFreshButton.setToggleState(value == "fresh", juce::dontSendNotification);
    filterRecentButton.setToggleState(value == "recent", juce::dontSendNotification);
    filterTimelessButton.setToggleState(value == "timeless", juce::dontSendNotification);
  }
  else if (filterType == "tone")
  {
    selectedTone = value;
    filterFunnyButton.setToggleState(value == "funny", juce::dontSendNotification);
    filterDeepButton.setToggleState(value == "deep", juce::dontSendNotification);
    filterDarkButton.setToggleState(value == "dark", juce::dontSendNotification);
  }
  else if (filterType == "semantic")
  {
    selectedSemantic = value;
    filterTightButton.setToggleState(value == "tight", juce::dontSendNotification);
    filterBalancedButton.setToggleState(value == "balanced", juce::dontSendNotification);
    filterWildButton.setToggleState(value == "wild", juce::dontSendNotification);
  }
  
  repaint();
}

void InspireVSTAudioProcessorEditor::clearPackCardButtons()
{
  for (auto* btn : packCardButtons)
  {
    removeChildComponent(btn);
    delete btn;
  }
  packCardButtons.clear();
}

void InspireVSTAudioProcessorEditor::createPackCardButtons()
{
  clearPackCardButtons();
  
  // Create buttons for each generated pack
  for (int i = 0; i < generatedPackItems.size(); ++i)
  {
    auto* btn = new juce::TextButton();
    juce::String buttonText = "Pack " + juce::String(i + 1);
    auto& packVar = generatedPackItems.getReference(i);
    if (packVar.isObject())
    {
      if (auto* packObj = packVar.getDynamicObject())
      {
        juce::String title = packObj->getProperty("title").toString().trim();
        if (title.isEmpty())
          title = packObj->getProperty("label").toString().trim();
        if (title.isEmpty())
          title = packObj->getProperty("headline").toString().trim();
        if (title.isNotEmpty())
          buttonText = title;
      }
    }
    btn->setButtonText(buttonText);
    btn->setColour(juce::TextButton::buttonColourId, juce::Colour(34, 211, 238).withAlpha(0.7f));
    btn->setColour(juce::TextButton::textColourOffId, juce::Colour(241, 245, 255));
    
    int capturedIndex = i;
    btn->onClick = [this, capturedIndex] {
      showPackDetail(capturedIndex);
    };
    
    packCardButtons.add(btn);
    addAndMakeVisible(btn);
  }
}

// ============ PHASE 1: VST INSTANCE BROADCASTING ============

void InspireVSTAudioProcessorEditor::refreshInstancesList()
{
  if (currentSyncRoomCode.isEmpty()) return;
  
  const auto serverUrl = serverUrlInput.getText();
  
  runAsync([this, serverUrl] {
    juce::String endpoint = serverUrl + "/api/rooms/" + 
                           juce::URL::addEscapeChars(currentSyncRoomCode, true) + "/instances";
    
    juce::URL url(endpoint);
    auto stream = url.createInputStream(juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress));
    
    if (stream) {
      juce::String response = stream->readEntireStreamAsString();
      auto parsed = juce::JSON::parse(response);
      
      juce::MessageManager::callAsync([this, parsed] {
        if (parsed.isObject()) {
          auto* obj = parsed.getDynamicObject();
          auto instancesArray = obj->getProperty("instances");
          
          if (instancesArray.isArray()) {
            activeInstances.clear();
            
            juce::String displayText;
            int count = instancesArray.getArray()->size();
            if (count == 0) {
              displayText = "No VST instances found in this room.\nPush a track to register this instance.";
            } else {
              displayText += "Destination: This plugin instance (" + shortInstanceId(pluginInstanceID) + ")\n";
              displayText += "Placement: Sync snapshot (AU/VST3 host behavior may not create visible MIDI regions directly).\n\n";
              for (const auto& inst : *instancesArray.getArray()) {
                activeInstances.add(inst);
                
                auto* instObj = inst.getDynamicObject();
                juce::String id = instObj->getProperty("pluginInstanceId").toString();
                juce::String trackName = instObj->getProperty("dawTrackName").toString();
                int trackIndex = instObj->getProperty("dawTrackIndex");
                int version = instObj->getProperty("version");
                juce::String role = instObj->getProperty("pluginRole").toString().toUpperCase();
                juce::String performer = instObj->getProperty("presenceLabel").toString();
                if (performer.isEmpty())
                  performer = instObj->getProperty("username").toString();
                if (performer.isEmpty())
                  performer = "Collaborator";
                
                // Highlight this instance with arrow
                juce::String marker = (id == pluginInstanceID) ? "→ " : "  ";

                juce::String humanTrack = "Track not reported by host";
                if (trackName.isNotEmpty())
                  humanTrack = trackName;
                else if (trackIndex >= 0)
                  humanTrack = "Logic Track " + juce::String(trackIndex + 1);

                displayText += marker + performer;
                if (role.isNotEmpty())
                  displayText += " [" + role + "]";
                displayText += "\n";
                displayText += "   Source Track: " + humanTrack + " | Version " + juce::String(version)
                  + " | ID " + shortInstanceId(id) + "\n";
              }
            }
            
            instancesDisplay.setText(displayText, false);
            refreshTransferSelectionOptions();
          }
        }
      });
    } else {
      juce::MessageManager::callAsync([this] {
        instancesDisplay.setText("Failed to fetch instances. Check connection.", false);
        activeInstances.clear();
        refreshTransferSelectionOptions();
      });
    }
  });
}

void InspireVSTAudioProcessorEditor::refreshTransferSelectionOptions()
{
  sourceOptionInstanceIds.clear();
  sourceOptionTrackIds.clear();
  sourceInstanceCombo.clear(juce::dontSendNotification);

  int preferredIndex = -1;
  int firstNonSelfIndex = -1;

  for (const auto& inst : activeInstances)
  {
    if (!inst.isObject())
      continue;

    auto* instObj = inst.getDynamicObject();
    if (instObj == nullptr)
      continue;

    const juce::String instanceId = instObj->getProperty("pluginInstanceId").toString();
    juce::String trackId = instObj->getProperty("trackId").toString();
    if (trackId.isEmpty())
      trackId = "vst-" + instanceId;

    juce::String performer = instObj->getProperty("presenceLabel").toString();
    if (performer.isEmpty())
      performer = instObj->getProperty("username").toString();
    if (performer.isEmpty())
      performer = "Collaborator";

    juce::String trackName = instObj->getProperty("dawTrackName").toString();
    if (trackName.isEmpty())
      trackName = trackId;

    const int rowIndex = sourceOptionInstanceIds.size();
    sourceOptionInstanceIds.add(instanceId);
    sourceOptionTrackIds.add(trackId);
    sourceInstanceCombo.addItem(performer + " - " + trackName + " (" + shortInstanceId(instanceId) + ")", rowIndex + 1);

    if (instanceId == selectedSourceInstanceId)
      preferredIndex = rowIndex;
    if (firstNonSelfIndex < 0 && instanceId != pluginInstanceID)
      firstNonSelfIndex = rowIndex;
  }

  if (sourceOptionInstanceIds.isEmpty())
  {
    sourceInstanceCombo.addItem("No source instances available", 1);
    sourceInstanceCombo.setSelectedId(1, juce::dontSendNotification);
    sourceInstanceCombo.setEnabled(false);
    selectedSourceInstanceId.clear();
    selectedSourceTrackId.clear();
    return;
  }

  sourceInstanceCombo.setEnabled(true);
  int selectedIndex = preferredIndex;
  if (selectedIndex < 0)
    selectedIndex = firstNonSelfIndex >= 0 ? firstNonSelfIndex : 0;

  sourceInstanceCombo.setSelectedItemIndex(selectedIndex, juce::dontSendNotification);
  selectedSourceInstanceId = sourceOptionInstanceIds[selectedIndex];
  selectedSourceTrackId = sourceOptionTrackIds[selectedIndex];
  updateUIForAuthState();
}

void InspireVSTAudioProcessorEditor::downloadPulledAssetsAsync(const juce::String& roomCode,
                                                               const juce::String& trackId,
                                                               int version)
{
  if (roomCode.isEmpty() || trackId.isEmpty() || version <= 0)
    return;

  const auto serverUrl = serverUrlInput.getText();
  const auto token = sessionToken;

  runAsync([this, serverUrl, token, roomCode, trackId, version]
  {
    const auto vizResponse = client.getCollabVisualization(serverUrl, roomCode, token, 200, 0);
    if (vizResponse.isEmpty())
      return;

    auto parsed = juce::JSON::parse(vizResponse);
    if (!parsed.isObject())
      return;

    juce::Array<juce::var> assetsToDownload;
    if (auto* rootObj = parsed.getDynamicObject())
    {
      const auto timelineVar = rootObj->getProperty("timeline");
      if (timelineVar.isArray())
      {
        for (const auto& eventVar : *timelineVar.getArray())
        {
          if (!eventVar.isObject())
            continue;
          auto* eventObj = eventVar.getDynamicObject();
          if (eventObj == nullptr)
            continue;

          const auto eventTrackId = eventObj->getProperty("trackId").toString();
          const int eventVersion = static_cast<int>(eventObj->getProperty("version"));
          if (eventTrackId != trackId || eventVersion != version)
            continue;

          const auto assetsVar = eventObj->getProperty("assets");
          if (assetsVar.isArray())
          {
            for (const auto& assetVar : *assetsVar.getArray())
              assetsToDownload.add(assetVar);
          }
          break;
        }
      }
    }

    if (assetsToDownload.isEmpty())
      return;

    const auto pulledRoot = defaultDownloadDir()
      .getChildFile("PulledAssets")
      .getChildFile(roomCode)
      .getChildFile(trackId)
      .getChildFile("v" + juce::String(version));
    pulledRoot.createDirectory();

    int downloaded = 0;
    int failed = 0;
    juce::StringArray downloadedNames;

    for (const auto& assetVar : assetsToDownload)
    {
      if (!assetVar.isObject())
        continue;
      auto* assetObj = assetVar.getDynamicObject();
      if (assetObj == nullptr)
        continue;

      const auto fileType = assetObj->getProperty("fileType").toString().toLowerCase();
      if (!(fileType.startsWith("audio/") || fileType == "audio/midi" || fileType == "audio/wav" || fileType == "audio/mpeg"))
        continue;

      auto fileName = assetObj->getProperty("fileName").toString();
      if (fileName.isEmpty())
        fileName = "pulled-asset-" + juce::String(downloaded + failed + 1);

      juce::String downloadUrl = assetObj->getProperty("downloadUrl").toString();
      if (downloadUrl.isEmpty())
      {
        const auto assetId = assetObj->getProperty("id").toString();
        if (assetId.isNotEmpty())
          downloadUrl = "/api/collab/assets/" + assetId;
      }
      if (downloadUrl.isEmpty())
      {
        ++failed;
        continue;
      }

      if (downloadUrl.startsWithChar('/'))
      {
        juce::String base = serverUrl.trimCharactersAtEnd("/");
        downloadUrl = base + downloadUrl;
      }

      const auto destFile = pulledRoot.getChildFile(fileName);
      const bool ok = client.downloadFileWithAuth(downloadUrl, token, destFile);
      if (ok)
      {
        ++downloaded;
        downloadedNames.add(destFile.getFileName());
      }
      else
      {
        ++failed;
      }
    }

    if (downloaded == 0 && failed == 0)
      return;

    juce::MessageManager::callAsync([this, downloaded, failed, downloadedNames, pulledRoot]
    {
      juce::String msg = "Pulled assets: " + juce::String(downloaded) + " downloaded";
      if (failed > 0)
        msg += ", " + juce::String(failed) + " failed";
      msg += " to " + pulledRoot.getFullPathName();
      addErrorLog(msg);

      if (downloaded > 0)
      {
        juce::String receipt = lastTransferDisplay.getText();
        receipt += "\nAssets: " + juce::String(downloaded) + " audio file(s) downloaded";
        setLastTransferReceipt(receipt);
      }
    });
  });
}

void InspireVSTAudioProcessorEditor::refreshSyncStatus()
{
  if (currentSyncRoomCode.isEmpty() || pluginInstanceID.isEmpty()) return;
  
  const auto serverUrl = serverUrlInput.getText();
  
  runAsync([this, serverUrl] {
    juce::String endpoint = serverUrl + "/api/rooms/" + 
                           juce::URL::addEscapeChars(currentSyncRoomCode, true) + 
                           "/sync-status?pluginInstanceId=" + 
                           juce::URL::addEscapeChars(pluginInstanceID, true);
    
    juce::URL url(endpoint);
    auto stream = url.createInputStream(juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress));
    
    if (stream) {
      juce::String response = stream->readEntireStreamAsString();
      auto parsed = juce::JSON::parse(response);
      
      juce::MessageManager::callAsync([this, parsed, serverUrl] {
        if (parsed.isObject()) {
          auto* obj = parsed.getDynamicObject();
          juce::String status = obj->getProperty("status").toString();
          myVersionNumber = obj->getProperty("myVersion");
          latestVersionNumber = obj->getProperty("latestVersion");
          int behindBy = obj->getProperty("behindBy");
          
          juce::String statusText;
          juce::Colour statusColor;
          
          if (status == "up-to-date") {
            statusText = "Ready: You're synced (v" + juce::String(myVersionNumber) + ")";
            
            // If Master role, append relay/create counts
            if (isMasterRole()) {
              // Fetch relay/create count from master state
              const auto stateEndpoint = serverUrl + "/api/master/room/" + 
                                        juce::URL::addEscapeChars(currentSyncRoomCode, true) + "/state";
              juce::URL stateUrl(stateEndpoint);
              if (auto stateStream = stateUrl.createInputStream(juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress))) {
                auto stateResponse = stateStream->readEntireStreamAsString();
                auto stateParsed = juce::JSON::parse(stateResponse);
                if (stateParsed.isObject()) {
                  auto* stateObj = stateParsed.getDynamicObject();
                  int relayCount = stateObj->getProperty("relayCount");
                  int createCount = stateObj->getProperty("createCount");
                  statusText += " | Relay: " + juce::String(relayCount) + " | Create: " + juce::String(createCount);
                }
              }
            }
            
            statusColor = juce::Colours::green;
          } else if (status == "behind") {
            statusText = "Updates waiting: pull " + juce::String(behindBy) + " change(s)";
            statusColor = juce::Colours::orange;
          } else if (status == "ahead") {
            statusText = "Unshared edits: push this instance (v" + juce::String(myVersionNumber) + ")";
            statusColor = juce::Colours::cyan;
          } else {
            statusText = "Sync status unavailable";
            statusColor = juce::Colour(148, 163, 184);
          }
          
          syncStatusIndicator.setText(statusText, juce::dontSendNotification);
          syncStatusIndicator.setColour(juce::Label::textColourId, statusColor);
        }
      });
    }
  });
}

void InspireVSTAudioProcessorEditor::startInstancePolling()
{
  // Poll every 5 seconds for updates
  lastPollTime = juce::Time::getCurrentTime().toMilliseconds();
  startTimer(5000);
}

void InspireVSTAudioProcessorEditor::stopInstancePolling()
{
  stopTimer();
}

void InspireVSTAudioProcessorEditor::fetchCollabVisualizationForUpdates(bool incremental)
{
  if (currentSyncRoomCode.isEmpty())
    return;

  const auto serverUrl = serverUrlInput.getText();
  const auto roomCode = currentSyncRoomCode;
  const auto authToken = sessionToken;
  const auto since = incremental ? lastCollabVizFetchAtMs : 0;

  runAsync([this, serverUrl, roomCode, authToken, since]
  {
    const auto response = client.getCollabVisualization(serverUrl, roomCode, authToken, 200, since);
    if (response.isEmpty())
      return;

    auto parsed = juce::JSON::parse(response);
    if (!parsed.isObject())
      return;

    juce::String grouped;
    int64_t newestEventTime = lastCollabVizFetchAtMs;

    if (auto* obj = parsed.getDynamicObject())
    {
      auto summaryVar = obj->getProperty("summary");
      if (summaryVar.isObject())
      {
        if (auto* summary = summaryVar.getDynamicObject())
        {
          grouped += "Timeline Tree";
          auto title = summary->getProperty("roomTitle").toString();
          if (title.isNotEmpty())
            grouped += " - " + title;
          grouped += "\n";
          grouped += "Pushes: " + summary->getProperty("totalPushes").toString() +
                     " | Assets: " + summary->getProperty("totalAssets").toString() +
                     " | Tracks: " + summary->getProperty("tracksTouched").toString() + "\n\n";
        }
      }

      auto treeVar = obj->getProperty("tree");
      if (treeVar.isArray())
      {
        const auto* tracks = treeVar.getArray();
        for (const auto& trackNodeVar : *tracks)
        {
          if (!trackNodeVar.isObject())
            continue;
          auto* trackNode = trackNodeVar.getDynamicObject();
          auto trackName = trackNode->getProperty("trackName").toString();
          auto trackIndex = trackNode->getProperty("trackIndex").toString();
          grouped += "Track " + trackIndex + ": " + trackName + "\n";

          auto instancesVar = trackNode->getProperty("instances");
          if (!instancesVar.isArray())
            continue;

          for (const auto& instanceNodeVar : *instancesVar.getArray())
          {
            if (!instanceNodeVar.isObject())
              continue;
            auto* instanceNode = instanceNodeVar.getDynamicObject();
            auto instanceId = instanceNode->getProperty("pluginInstanceId").toString();
            grouped += "  VST " + instanceId + "\n";

            auto pushesVar = instanceNode->getProperty("pushes");
            if (!pushesVar.isArray())
              continue;

            int pushCount = 0;
            for (const auto& pushVar : *pushesVar.getArray())
            {
              if (!pushVar.isObject())
                continue;
              if (++pushCount > 5)
                break;

              auto* pushObj = pushVar.getDynamicObject();
              int version = static_cast<int>(pushObj->getProperty("version"));
              auto editType = pushObj->getProperty("editType").toString();
              auto actor = pushObj->getProperty("pushedByUsername").toString();
              if (actor.isEmpty())
                actor = pushObj->getProperty("updatedBy").toString();

              int64 eventTime = static_cast<int64>(pushObj->getProperty("eventTime"));
              newestEventTime = juce::jmax(newestEventTime, eventTime);
              juce::String timeText = eventTime > 0
                ? juce::Time(eventTime).formatted("%H:%M:%S")
                : juce::String("?");

              juce::String beatText;
              const auto beatVar = pushObj->getProperty("trackBeat");
              if (!beatVar.isVoid() && beatVar.toString().isNotEmpty())
                beatText = " beat:" + beatVar.toString();

              juce::String durationText;
              const auto durationVar = pushObj->getProperty("durationSeconds");
              if (!durationVar.isVoid() && durationVar.toString().isNotEmpty())
                durationText = " dur:" + durationVar.toString() + "s";

              grouped += "    - [" + timeText + "] v" + juce::String(version) + " " + editType;
              if (actor.isNotEmpty())
                grouped += " by " + actor;
              grouped += beatText + durationText + "\n";
            }
          }
          grouped += "\n";
        }
      }
    }

    juce::MessageManager::callAsync([this, grouped, newestEventTime]
    {
      groupedTimelineText = grouped;
      if (newestEventTime > 0)
        lastCollabVizFetchAtMs = newestEventTime;
      if (selectedMode == "updates")
        refreshUpdatesDisplay();
    });
  });
}

void InspireVSTAudioProcessorEditor::checkForRecentPushes()
{
  // Phase 2: Check for recent pushes without full instances refresh
  if (currentSyncRoomCode.isEmpty()) return;
  
  const auto serverUrl = serverUrlInput.getText();
  const auto sinceTime = lastPollTime;
  
  runAsync([this, serverUrl, sinceTime] {
    juce::String endpoint = serverUrl + "/api/rooms/" +
                           juce::URL::addEscapeChars(currentSyncRoomCode, true) +
                           "/recent-pushes?since=" +
                           juce::String(sinceTime);
    
    juce::URL url(endpoint);
    auto stream = url.createInputStream(juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress));
    
    if (stream) {
      juce::String response = stream->readEntireStreamAsString();
      auto parsed = juce::JSON::parse(response);
      
      if (parsed.isObject()) {
        auto* obj = parsed.getDynamicObject();
        auto* pushesArray = obj->getProperty("pushes").getArray();
        
        if (pushesArray && pushesArray->size() > 0) {
          // Recent pushes detected - refresh full instances and status
          juce::MessageManager::callAsync([this] {
            refreshInstancesList();
            refreshSyncStatus();
            fetchCollabVisualizationForUpdates(true);
          });
        }
      }
    }
    
    // Update poll time
    lastPollTime = juce::Time::getCurrentTime().toMilliseconds();
  });
}

void InspireVSTAudioProcessorEditor::pollAuthBridge()
{
  if (pendingAuthBridgeId.isEmpty() || authBridgePollInFlight)
    return;

  const auto now = juce::Time::currentTimeMillis();
  const auto timeoutMs = static_cast<int64_t>(2 * 60 * 1000);
  if (pendingAuthBridgeStartedAtMs > 0 && now - pendingAuthBridgeStartedAtMs > timeoutMs)
  {
    pendingAuthBridgeId = "";
    pendingAuthBridgeStartedAtMs = 0;
    lastAuthBridgePollAtMs = 0;
    authBridgePollInFlight = false;
    setStatus("Browser login timed out. Click Login again.");
    return;
  }

  const auto pollIntervalMs = static_cast<int64_t>(1000);
  if (lastAuthBridgePollAtMs > 0 && now - lastAuthBridgePollAtMs < pollIntervalMs)
    return;

  authBridgePollInFlight = true;
  lastAuthBridgePollAtMs = now;

  const auto serverUrl = serverUrlInput.getText().trim();
  const auto bridgeId = pendingAuthBridgeId;

  runAsync([this, serverUrl, bridgeId]
  {
    const auto response = client.consumeVstAuthBridge(serverUrl, bridgeId);

    juce::MessageManager::callAsync([this, bridgeId, response]
    {
      authBridgePollInFlight = false;

      if (pendingAuthBridgeId != bridgeId)
        return;

      if (!response.completed)
      {
        if (response.errorMessage.isNotEmpty())
          addErrorLog("Auth bridge poll error: " + response.errorMessage);
        return;
      }

      if (response.accessToken.isEmpty())
      {
        addErrorLog("Auth bridge completed without token.");
        return;
      }

      sessionToken = response.accessToken;
      isAuthenticated = true;
      isGuest = response.isGuest;
      authUsername = response.displayName.isNotEmpty() ? response.displayName : (isGuest ? "Guest" : "User");
      authStatus = isGuest ? "guest" : "authenticated";
      sessionStartTimeMs = juce::Time::currentTimeMillis();

      pendingAuthBridgeId = "";
      pendingAuthBridgeStartedAtMs = 0;
      lastAuthBridgePollAtMs = 0;

      updateUIForAuthState();
      saveSessionData();
      setStatus("Login successful.");
      addErrorLog("✓ Browser login linked to VST session.");
    });
  });
}

void InspireVSTAudioProcessorEditor::timerCallback()
{
  // Poll browser auth bridge first, regardless of mode.
  pollAuthBridge();

  // Called every 5 seconds when in Updates mode
  if (selectedMode == "updates" && !currentSyncRoomCode.isEmpty()) {
    refreshRecordReadyBanner();
    // Phase 3: Process WebSocket queued messages if connected
    if (wsClient)
      wsClient->processMessages();
    
    // Phase 2: Use smart polling as fallback (if WebSocket not connected)
    if (!wsClient || !wsClient->isConnected())
    {
      checkForRecentPushes();
    }
  } else {
    // Stop timer only when neither updates nor auth bridge polling is active.
    if (pendingAuthBridgeId.isEmpty())
      stopTimer();
  }
}

// ============ PHASE 3: WEBSOCKET REAL-TIME SYNC ============

void InspireVSTAudioProcessorEditor::startWebSocketSync()
{
  // Phase 3: Establish WebSocket connection for real-time updates
  if (currentSyncRoomCode.isEmpty())
  {
    // Fallback to polling if not in a room
    startInstancePolling();
    return;
  }

  // Initialize WebSocket client if not already created
  if (!wsClient)
  {
    wsClient = std::make_unique<WebSocketClient>();
    
    // Set callbacks for WebSocket events
    wsClient->setOnConnectCallback([this]
    {
      juce::String msg = "[WebSocket] Connected to sync server";
      addErrorLog(msg);

      juce::DynamicObject::Ptr joinMsg = new juce::DynamicObject();
      const auto role = effectivePluginRole();
      const auto resolvedMasterId = masterInstanceId.isNotEmpty() ? masterInstanceId : pluginInstanceID;
      joinMsg->setProperty("type", "join");
      joinMsg->setProperty("pluginInstanceId", pluginInstanceID);
      joinMsg->setProperty("roomCode", currentSyncRoomCode);
      joinMsg->setProperty("username", authUsername.isNotEmpty() ? authUsername : "Guest");
      joinMsg->setProperty("pluginRole", role);
      joinMsg->setProperty("masterInstanceId", resolvedMasterId);
      joinMsg->setProperty("timestamp", juce::Time::currentTimeMillis());
      wsClient->sendMessage(juce::JSON::toString(juce::var(joinMsg.get())));

      juce::DynamicObject::Ptr syncReq = new juce::DynamicObject();
      syncReq->setProperty("type", "sync-request");
      syncReq->setProperty("pluginInstanceId", pluginInstanceID);
      syncReq->setProperty("roomCode", currentSyncRoomCode);
      syncReq->setProperty("timestamp", juce::Time::currentTimeMillis());
      wsClient->sendMessage(juce::JSON::toString(juce::var(syncReq.get())));
    });
    
    wsClient->setOnDisconnectCallback([this]
    {
      juce::String msg = "[WebSocket] Disconnected, falling back to polling";
      addErrorLog(msg);
      // Fallback to polling if WebSocket disconnects
      startInstancePolling();
    });
    
    wsClient->setOnErrorCallback([this](const juce::String& error)
    {
      juce::String msg = "[WebSocket] Error: " + error + " - using polling";
      addErrorLog(msg);
      // Fallback to polling on error
      startInstancePolling();
    });
    
    wsClient->setOnMessageCallback([this](const VSWSMessage& msg)
    {
      handleWebSocketMessage(msg);
    });
  }

  // Connect to WebSocket server
  connectWebSocket();
  
  // Also start polling as fallback while WebSocket connects
  startInstancePolling();
}

void InspireVSTAudioProcessorEditor::stopWebSocketSync()
{
  // Phase 3: Disconnect WebSocket and stop polling
  disconnectWebSocket();
  stopInstancePolling();
}

void InspireVSTAudioProcessorEditor::connectWebSocket()
{
  // Phase 3: Establish WebSocket connection
  if (!wsClient || currentSyncRoomCode.isEmpty())
    return;

  const auto serverUrl = serverUrlInput.getText();
  
  // Convert http/https to ws/wss
  juce::String wsUrl = serverUrl;
  wsUrl = wsUrl.replace("https://", "wss://");
  wsUrl = wsUrl.replace("http://", "ws://");
  wsUrl = wsUrl.trimCharactersAtEnd("/");
  wsUrl += "/ws/sync";

  addErrorLog("Connecting WebSocket to: " + wsUrl);
  
  // This runs on a background thread
  wsClient->connect(wsUrl);
}

void InspireVSTAudioProcessorEditor::disconnectWebSocket()
{
  // Phase 3: Close WebSocket connection
  if (wsClient)
    wsClient->disconnect();
}

void InspireVSTAudioProcessorEditor::handleWebSocketMessage(const VSWSMessage& msg)
{
  // Phase 3: Process real-time WebSocket message
  juce::String logMsg = "[WS] " + msg.type;
  
  if (msg.type == "instance-joined")
  {
    const auto presence = msg.presenceLabel.isNotEmpty() ? msg.presenceLabel : msg.username;
    logMsg += " - " + msg.pluginInstanceId.substring(0, 8)
            + (presence.isNotEmpty() ? " (" + presence + ")" : "")
            + (msg.pluginRole.isNotEmpty() ? " role=" + msg.pluginRole.toUpperCase() : "");
    addErrorLog(logMsg);
    appendUpdateEvent("ws",
                      msg.pluginInstanceId,
                      0,
                      0,
                      "Instance joined" + (presence.isNotEmpty() ? " (" + presence + ")" : ""));
    // Refresh instances list to show new instance
    juce::MessageManager::callAsync([this] {
      refreshInstancesList();
      fetchCollabVisualizationForUpdates(true);
    });
  }
  else if (msg.type == "track-update")
  {
    logMsg += " - " + msg.pluginInstanceId.substring(0, 8) + " v" + juce::String(msg.version)
            + (msg.pluginRole.isNotEmpty() ? " [" + msg.pluginRole.toUpperCase() + "]" : "");
    addErrorLog(logMsg);
    appendUpdateEvent("ws",
                      msg.pluginInstanceId,
                      msg.version,
                      0,
                      "Remote track update received");
    // Refresh instances and sync status on update
    juce::MessageManager::callAsync([this]
    {
      refreshInstancesList();
      refreshSyncStatus();
      fetchCollabVisualizationForUpdates(true);
    });
  }
  else if (msg.type == "instance-left")
  {
    const auto presence = msg.presenceLabel.isNotEmpty() ? msg.presenceLabel : msg.username;
    logMsg += " - " + msg.pluginInstanceId.substring(0, 8)
            + (presence.isNotEmpty() ? " (" + presence + ")" : "");
    addErrorLog(logMsg);
    appendUpdateEvent("ws",
                      msg.pluginInstanceId,
                      0,
                      0,
                      "Instance left room");
    // Refresh instances list after instance leaves
    juce::MessageManager::callAsync([this] {
      refreshInstancesList();
      fetchCollabVisualizationForUpdates(true);
    });
  }
}


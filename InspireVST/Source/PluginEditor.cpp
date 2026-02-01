#include "PluginEditor.h"
#include <cstdlib>

namespace
{
juce::String getLocalIPAddress()
{
  // Read from .vst-server-url file written by run_dev.sh
  juce::File configFile(juce::File::getSpecialLocation(juce::File::userHomeDirectory)
    .getParentDirectory()
    .getChildFile("TildeSec/Inspire/Inspire/.vst-server-url"));
  
  if (configFile.exists() && configFile.getSize() > 0)
  {
    juce::String url = configFile.loadFileAsString().trim();
    if (url.startsWith("https://") || url.startsWith("http://"))
    {
      return url;
    }
  }
  
  return "https://localhost:3000";
}

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
}

InspireVSTAudioProcessorEditor::InspireVSTAudioProcessorEditor(
  InspireVSTAudioProcessor& processorRef)
  : AudioProcessorEditor(&processorRef),
    processor(processorRef),
    listModel(*this)
{
  setSize(520, 600);

  // Style text inputs - matching web app glassmorphism
  auto styleTextInput = [](juce::TextEditor& input) {
    input.setColour(juce::TextEditor::backgroundColourId, juce::Colour(10, 16, 37).withAlpha(0.62f));
    input.setColour(juce::TextEditor::textColourId, juce::Colour(241, 245, 255).withAlpha(0.96f));
    input.setColour(juce::TextEditor::highlightColourId, juce::Colour(236, 72, 153).withAlpha(0.4f));
    input.setColour(juce::TextEditor::outlineColourId, juce::Colour(148, 163, 184).withAlpha(0.18f));
    input.setFont(juce::Font(13.0f));
    input.setBorder(juce::BorderSize<int>(1));
  };

  serverUrlInput.setTextToShowWhenEmpty("Server URL", juce::Colour(241, 245, 255).withAlpha(0.5f));
  serverUrlInput.setText(detectLocalServerUrl());
  styleTextInput(serverUrlInput);
  
  roomIdInput.setTextToShowWhenEmpty("Room ID", juce::Colour(241, 245, 255).withAlpha(0.5f));
  styleTextInput(roomIdInput);
  
  codeInput.setTextToShowWhenEmpty("Room Code", juce::Colour(241, 245, 255).withAlpha(0.5f));
  codeInput.setPasswordCharacter('*');
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
  styleButton(loginButton, cyanAccent);
  styleButton(joinButton, cyanAccent);
  styleButton(createRoomButton, cyanAccent);
  styleButton(refreshButton, cyanAccent);
  styleButton(downloadButton, cyanAccent);

  joinButton.onClick = [this] { startJoin(); };
  loginButton.onClick = [this] { startLogin(); };
  createRoomButton.onClick = [this] { startCreateRoom(); };
  refreshButton.onClick = [this] { refreshFiles(); };
  downloadButton.onClick = [this] { downloadSelected(); };

  statusLabel.setText("Ready", juce::dontSendNotification);
  statusLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.7f));
  statusLabel.setFont(juce::Font(11.0f));
  
  tokenLabel.setText("Session: -", juce::dontSendNotification);
  tokenLabel.setColour(juce::Label::textColourId, juce::Colour(241, 245, 255).withAlpha(0.6f));
  tokenLabel.setFont(juce::Font(10.0f));
  tokenLabel.setJustificationType(juce::Justification::centredLeft);

  fileList.setModel(&listModel);

  addAndMakeVisible(serverUrlInput);
  addAndMakeVisible(roomIdInput);
  addAndMakeVisible(codeInput);
  addAndMakeVisible(passwordInput);
  addAndMakeVisible(loginButton);
  addAndMakeVisible(joinButton);
  addAndMakeVisible(createRoomButton);
  addAndMakeVisible(refreshButton);
  addAndMakeVisible(downloadButton);
  addAndMakeVisible(statusLabel);
  addAndMakeVisible(tokenLabel);
  addAndMakeVisible(fileList);
}

InspireVSTAudioProcessorEditor::~InspireVSTAudioProcessorEditor() = default;

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
  
  // Header section with logo
  g.setColour(juce::Colour(241, 245, 255).withAlpha(0.96f));
  g.setFont(juce::Font(20.0f).withExtraKerningFactor(0.1f));
  g.drawText("Inspire", 16, 8, 200, 28, juce::Justification::centredLeft);
  
  // Subtitle
  g.setColour(juce::Colour(241, 245, 255).withAlpha(0.6f));
  g.setFont(juce::Font(11.0f));
  g.drawText("Collaboration Hub", 16, 28, 200, 16, juce::Justification::centredLeft);
}

void InspireVSTAudioProcessorEditor::resized()
{
  const int padding = 14;
  const int lineHeight = 32;
  const int gap = 8;
  const int buttonWidth = 110;
  const int headerHeight = 48;

  // Header area (logo already painted)
  int yPos = headerHeight + padding;

  // Server URL field (full width)
  serverUrlInput.setBounds(padding, yPos, getWidth() - padding * 2, lineHeight);
  yPos += lineHeight + gap;

  // Login button (full width)
  loginButton.setBounds(padding, yPos, getWidth() - padding * 2, lineHeight);
  yPos += lineHeight + gap + 4;

  // Room ID and Code (side by side)
  int halfWidth = (getWidth() - padding * 3 - gap) / 2;
  roomIdInput.setBounds(padding, yPos, halfWidth, lineHeight);
  codeInput.setBounds(padding * 2 + halfWidth, yPos, halfWidth, lineHeight);
  yPos += lineHeight + gap;

  // Join button
  joinButton.setBounds(padding, yPos, getWidth() - padding * 2, lineHeight);
  yPos += lineHeight + gap;

  // Password field
  passwordInput.setBounds(padding, yPos, getWidth() - padding * 2, lineHeight);
  yPos += lineHeight + gap;

  // Create Room button
  createRoomButton.setBounds(padding, yPos, getWidth() - padding * 2, lineHeight);
  yPos += lineHeight + gap + 4;

  // Status info
  tokenLabel.setBounds(padding, yPos, getWidth() - padding * 2, 18);
  yPos += 20;
  statusLabel.setBounds(padding, yPos, getWidth() - padding * 2, 18);
  yPos += 22;

  // Action buttons (Refresh and Download side by side)
  int actionWidth = (getWidth() - padding * 3 - gap) / 2;
  refreshButton.setBounds(padding, yPos, actionWidth, lineHeight);
  downloadButton.setBounds(padding * 2 + actionWidth, yPos, actionWidth, lineHeight);
  yPos += lineHeight + gap;

  // File list (remaining space)
  fileList.setBounds(padding, yPos, getWidth() - padding * 2, getHeight() - yPos - padding);
}

void InspireVSTAudioProcessorEditor::runAsync(std::function<void()> task)
{
  threadPool.addJob(new LambdaJob(std::move(task)), true);
}

void InspireVSTAudioProcessorEditor::setStatus(const juce::String& message)
{
  statusLabel.setText(message, juce::dontSendNotification);
}

void InspireVSTAudioProcessorEditor::setBusy(bool shouldBeBusy)
{
  busy = shouldBeBusy;
  loginButton.setEnabled(!busy);
  joinButton.setEnabled(!busy);
  createRoomButton.setEnabled(!busy);
  refreshButton.setEnabled(!busy && sessionToken.isNotEmpty());
  downloadButton.setEnabled(!busy && sessionToken.isNotEmpty());
}

void InspireVSTAudioProcessorEditor::startJoin()
{
  if (busy)
  {
    return;
  }
  const auto roomId = roomIdInput.getText().trim();
  const auto code = codeInput.getText().trim();
  if (roomId.isEmpty() || code.isEmpty())
  {
    setStatus("Enter room ID and code");
    return;
  }

  setBusy(true);
  setStatus("Joining room...");

  runAsync([this, roomId, code] {
    const auto result = client.joinRoom(roomId, code);
    juce::MessageManager::callAsync([this, result] {
      if (result.token.isNotEmpty())
      {
        sessionToken = result.token;
        lastServerTimeMs = result.expiresAtMs;
        tokenLabel.setText("Session: " + sessionToken.substring(0, 12) + "...",
          juce::dontSendNotification);
        setStatus("Joined. Refresh files.");
      }
      else
      {
        setStatus("Join failed. Check room ID/code.");
      }
      setBusy(false);
    });
  });
}
void InspireVSTAudioProcessorEditor::startLogin()
{
  if (busy)
  {
    return;
  }

  setBusy(true);
  setStatus("Opening Inspire login in browser...");

  // Use the server URL from the input field
  juce::String urlString = serverUrlInput.getText();
  if (urlString.isEmpty())
  {
    urlString = "https://localhost:3000";
  }
  
  juce::URL loginUrl(urlString);
  loginUrl.launchInDefaultBrowser();

  juce::MessageManager::callAsync([this] {
    setStatus("Login opened. Paste your token below after authenticating.");
    setBusy(false);
  });
}
void InspireVSTAudioProcessorEditor::startCreateRoom()
{
  if (busy)
  {
    return;
  }
  
  const auto password = passwordInput.getText().trim();
  
  setBusy(true);
  setStatus("Creating room...");

  runAsync([this, password] {
    const auto result = client.createRoom(password);
    juce::MessageManager::callAsync([this, result] {
      if (result.roomId.isNotEmpty() && result.code.isNotEmpty())
      {
        roomIdInput.setText(result.roomId, false);
        codeInput.setText(result.code, false);
        setStatus("Room created! Room ID: " + result.roomId + ", Code: " + result.code);
      }
      else
      {
        setStatus("Failed to create room. Check network connection.");
      }
      setBusy(false);
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
  g.setFont(juce::Font(12.0f));

  juce::String label = item.name;
  if (updated)
  {
    g.setColour(juce::Colour(34, 211, 238).withAlpha(0.9f));  // Cyan dot
    label = "● " + label;
  }
  
  g.drawText(label, 8, 0, width - 16, height, juce::Justification::centredLeft);
}

juce::String InspireVSTAudioProcessorEditor::detectLocalServerUrl()
{
  return getLocalIPAddress();
}

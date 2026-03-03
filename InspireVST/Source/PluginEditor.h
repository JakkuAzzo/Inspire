#pragma once

#include <juce_gui_extra/juce_gui_extra.h>
#include <fontaudio/fontaudio.h>
#include "PluginProcessor.h"
#include "NetworkClient.h"
#include "WebSocketClient.h"
#include "PackDetailComponent.h"
#include "LyricEditorComponent.h"
#include "FilterControlComponent.h"
#include "InspirationQueueDialog.h"
#include "FilterDialogComponent.h"

class InspireVSTAudioProcessorEditor final : public juce::AudioProcessorEditor,
                                                     public juce::Timer
{
public:
  explicit InspireVSTAudioProcessorEditor(InspireVSTAudioProcessor& processor);
  ~InspireVSTAudioProcessorEditor() override;

  void paint(juce::Graphics& g) override;
  void resized() override;
  void mouseDown(const juce::MouseEvent& event) override;
  void mouseMove(const juce::MouseEvent& event) override;
  void timerCallback() override;  // Phase 1: For polling instances/sync status
  
  enum class UIState
  {
    InitialView,      // Show only Generate button + 9 filter buttons
    GeneratedView     // Show Pack Cards (left) + Inspiration Queue (right)
  };

private:
  void startLogin();
  void startSignup();
  void startGuestMode();
  void startJoin();
  void startCreateRoom();
  void refreshFiles();
  void updateSessionInfoDisplay();
  void downloadSelected();
  void setStatus(const juce::String& message);
  void setBusy(bool shouldBeBusy);
  void updateFileList(const InspireListResult& result);
  void updateUIForAuthState();
  juce::String detectLocalServerUrl();
  
  // DAW Sync - room code persistence and polling
  void loadRoomCode();
  void saveRoomCode();
  void saveSessionData();
  void loadSessionData();
  void startSyncPolling();
  void stopSyncPolling();
  void pollTrackState();
  void onSyncPullResponse(const DAWSyncPullResponse& response);
  void showSyncConflictAlert(const juce::String& trackId, const DAWSyncPullResponse& serverState);

  void runAsync(std::function<void()> task);
  void addErrorLog(const juce::String& message);
  void showErrorLogs();
  
  // Session helpers
  bool isSessionExpired() const;
  int getRemainingMinutes() const;
  
  // Mode card handlers
  void selectWriterLab();
  void selectProducerLab();
  void selectEditorSuite();
  void selectUpdates();
  void selectSearch();
  void pushTrack();
  void pullTrack();
  void generatePackForSelection();

  InspireVSTAudioProcessor& processor;
  InspireNetworkClient client;

  // Error logging
  juce::StringArray errorLogs;
  static const int MAX_ERROR_LOGS = 100;

  juce::TextEditor serverUrlInput;
  juce::TextEditor roomIdInput;
  juce::TextEditor codeInput;
  juce::TextEditor passwordInput;
  juce::TextButton guestButton{"Continue as Guest"};
  juce::TextButton signupButton{"Sign Up"};
  juce::TextButton loginButton{"Login"};
  juce::TextButton createRoomButton{"Create Room"};
  juce::TextButton joinButton{"Join Room"};
  juce::TextButton refreshButton{"Refresh Files"};
  juce::TextButton downloadButton{"Download Selected"};
  juce::TextButton settingsButton{"Settings"};
  juce::Label statusLabel;
  juce::Label tokenLabel;
  juce::Label syncStatusLabel;
  juce::Label authStatusLabel;
  juce::ListBox fileList;
  
  // Mode selection cards (shown after joining/creating room)
  juce::TextButton writerLabCard{"Writer Lab"};
  juce::TextButton producerLabCard{"Producer Lab"};
  juce::TextButton editorSuiteCard{"Editor Suite"};
  juce::TextButton updatesCard{"Updates"};
  juce::TextButton searchCard{"Search"};
  
  // When a mode is opened, show this header and a back button to return to mode selection
  juce::TextButton backButton{"Back"};
  juce::Label modeTitleLabel;
  
  // Push/Pull controls (within updates card)
  juce::TextButton pushTrackButton{"Push This Track"};
  juce::TextButton pullTrackButton{"Pull This Track"};
  juce::TextEditor pushLogDisplay;
  juce::Label pushLogLabel;

  // Phase 1: VST Instance Broadcasting - Instances list display
  juce::Label instancesListLabel;
  juce::TextEditor instancesDisplay;
  juce::Label syncStatusIndicator;
  juce::Array<juce::var> activeInstances;
  int myVersionNumber = 0;
  int latestVersionNumber = 0;
  void refreshInstancesList();
  void refreshSyncStatus();
  void startInstancePolling();
  void stopInstancePolling();
  
  // Phase 2: Smart polling - track recent pushes without full refresh
  int64 lastPollTime = 0;
  void checkForRecentPushes();

  // Phase 3: Real-time WebSocket sync for instant updates
  std::unique_ptr<WebSocketClient> wsClient;
  void connectWebSocket();
  void disconnectWebSocket();
  void handleWebSocketMessage(const VSWSMessage& msg);
  void startWebSocketSync();
  void stopWebSocketSync();

  // Room info displayed at top when in a room
  juce::Label roomInfoLabel;
  juce::Label roomPasswordLabel;

  // Interactive pack list for selected mode
  juce::ListBox packList;
  // Filter controls for pack generation
  std::unique_ptr<FilterControlComponent> filterControl;
  RelevanceFilter currentFilters{{}, {}, {}};
  void onFilterChanged(const RelevanceFilter& newFilter);
  
  // Search UI (transient within Search mode)
  juce::TextEditor searchInput;
  juce::TextButton searchGoButton{"Search"};
  juce::TextButton searchPrevButton{"Prev"};
  juce::TextButton searchNextButton{"Next"};
  juce::Label searchPageLabel;
  int searchPage = 1;
  int searchPageSize = 12;
  juce::TextButton generatePackButton{"Generate Pack"};
  juce::TextButton remixPackButton{"Remix Pack"};
  juce::Array<juce::var> packItems; // submodes/search items backing ListBox
  juce::Array<juce::var> generatedPackItems; // generated packs backing GeneratedView buttons
  juce::String selectedSubmodeId;
  std::unique_ptr<PackDetailComponent> packDetailComponent;
  // pack-level fork button removed; forking now available in Search mode as 'Fork & Mix'
  juce::TextButton savePackButton{"Save Pack"};
  juce::TextButton exportPackButton{"Export JSON"};
  juce::TextEditor producerDetailDisplay;
  juce::TextEditor editorDetailDisplay;
  juce::TextButton producerGenerateButton{"Generate Sample"};
  juce::TextButton editorOpenButton{"Open Editor"};

  // Instance id for this plugin instance
  juce::String instanceId;

  void showPackDetail(int index);
  void saveSelectedPack();
  void exportSelectedPackAsJSON();
  void forkSelectedPack();
  void renderGeneratedPack(const juce::var& pack);
  void addPackToInspirationQueue(const juce::var& pack);
  void openWritingNotepadWithPack(const juce::var& pack);
  juce::var currentDisplayedPack;
  
  // Listener to wire PackDetailComponent events to LyricEditorComponent
  class PackDetailListener : public PackDetailComponent::Listener
  {
  public:
    explicit PackDetailListener(InspireVSTAudioProcessorEditor& ownerRef) : owner(ownerRef) {}
    void wordChipClicked(const juce::String& word) override;
    void lyricFragmentClicked(const juce::String& fragment) override;
    void flowPromptClicked(const juce::String& prompt) override;
    void addToInspirationClicked(const juce::String& label) override;
    void audioPreviewClicked(const juce::String& url) override;
  private:
    InspireVSTAudioProcessorEditor& owner;
  } packDetailListener{*this};
  
  // Audio preview player
  juce::TextButton playPreviewButton{"Play Preview"};
  juce::AudioFormatManager formatManager;
  juce::AudioTransportSource transportSource;
  std::unique_ptr<juce::AudioFormatReaderSource> transportReaderSource;
  juce::AudioDeviceManager deviceManager;
  juce::AudioSourcePlayer audioSourcePlayer;

  // Async preview downloader / player
  void loadPreviewFromUrlAsync(const juce::String& url, int row = -1);
  juce::File lastPreviewFile;
  std::unique_ptr<juce::InputStream> previewStreamOwner; // holds streaming InputStream when playing directly
  juce::File previewTempFile; // reusable temp file for previews

  // Queue/DAW actions
  juce::TextButton addToQueueButton{"Add to Queue"};
  juce::TextButton addToInspirationButton{"Add to Inspiration Queue"};
  juce::TextButton openNotepadButton{"Open Notepad"};
  juce::TextButton insertPackButton{"Insert Pack"};
  juce::ListBox inspirationQueueList;
  juce::Array<juce::var> inspirationQueue;
  // read-only list of inspirations (fallback textual display)
  juce::TextEditor inspirationQueueDisplay;
  class InspirationListModel : public juce::ListBoxModel
  {
  public:
    explicit InspirationListModel(InspireVSTAudioProcessorEditor& ownerRef) : owner(ownerRef) {}
    int getNumRows() override;
    void paintListBoxItem(int row, juce::Graphics& g, int width, int height, bool rowIsSelected) override;
    void listBoxItemClicked(int row, const juce::MouseEvent&) override;
  private:
    InspireVSTAudioProcessorEditor& owner;
  } inspirationListModel{*this};
  std::unique_ptr<LyricEditorComponent> lyricEditorComponent; // user editable notepad with analysis
  void addToInspirationQueue(const juce::var& pack);
  
  // New dialogs for pack exploration
  std::unique_ptr<InspirationQueueDialog> inspirationQueueDialog;
  std::unique_ptr<FilterDialogComponent> filterDialog;
  
  void showInspirationQueueDialog(const juce::var& pack);
  void showFilterDialog();
  void addPackToQueue(const juce::var& pack);
  void insertPackIntoDAW(const juce::var& pack);

  class PackListModel : public juce::ListBoxModel
  {
  public:
    explicit PackListModel(InspireVSTAudioProcessorEditor& ownerRef) : owner(ownerRef) {}

    int getNumRows() override;
    void paintListBoxItem(int row, juce::Graphics& g, int width, int height, bool rowIsSelected) override;
    void listBoxItemClicked(int row, const juce::MouseEvent&) override;

    // Provide a component per row so we can have interactive buttons inside each pack card
    juce::Component* refreshComponentForRow(int row, bool /*isRowSelected*/, juce::Component* existingComponentToUpdate) override;
    void deleteComponentForRow(int row, juce::Component* componentToDelete);

  private:
    InspireVSTAudioProcessorEditor& owner;
  } packListModel{*this};

  // Lightweight PackCard component used inside the ListBox
  class PackCard : public juce::Component
  {
  public:
    PackCard(InspireVSTAudioProcessorEditor& ownerRef, int rowIndex);
    ~PackCard() override {}

    void paint(juce::Graphics& g) override;
    void resized() override;
    void setRow(int newRow);
    InspireVSTAudioProcessorEditor& owner;
    int row = -1;

    juce::Label titleLabel;
    juce::Label descLabel;
    juce::TextButton previewButton{"Preview"};
    juce::TextButton forkButton{"Fork"};
    juce::TextButton saveButton{"Save"};
    juce::TextButton queueButton{"Add to Queue"};
    juce::TextButton insertButton{"Insert"};

    // Loading/progress UI
    double previewProgress = 0.0;
    juce::ProgressBar progressBar{previewProgress};
    bool isLoading = false;
    void setLoading(bool shouldLoad) { isLoading = shouldLoad; progressBar.setVisible(isLoading); }
    void setProgress(double p) { previewProgress = p; }
  };

  juce::Array<InspireFileItem> files;
  juce::HashMap<juce::String, int64_t> lastSeenUpdates;
  juce::StringArray recentlyUpdated;

  juce::String sessionToken;
  int64_t lastServerTimeMs = 0;
  bool busy = false;
  bool isAuthenticated = false;
  bool isGuest = false;
  juce::String authUsername;
  bool inRoom = false;  // Track if we're in a collaboration room
  juce::String selectedMode;  // "writer", "producer", "editor", or empty
  juce::StringArray pushLog;  // Recent push/pull activity log
  juce::Array<juce::var> updatesList; // structured updates for Updates mode

  // Session info for collaboration display
  juce::String authStatus{"guest"};  // "guest" or "authenticated"
  int64_t sessionStartTimeMs = 0;    // When session/room was created
  int64_t sessionDurationMs = 3600000; // Default 1 hour in ms
  juce::String pluginInstanceID;     // Unique identifier for this plugin instance
  
  // Session card button bounds for click detection
  juce::Rectangle<int> sessionCardBounds;
  juce::Rectangle<int> roomCodeCopyBounds;
  juce::Rectangle<int> passwordCopyBounds;
  juce::Rectangle<int> leaveRoomBounds;
  juce::Rectangle<int> logoBounds;  // Logo click area for menu
  int64_t lastCopyFeedbackTimeMs = 0;  // For copy feedback animation
  int lastCopiedButton = -1;  // 0 = room code, 1 = password

  void refreshUpdatesDisplay();
  void paintSessionInfoCard(juce::Graphics& g, int x, int y, int width, int height);
  void handleSessionCardClick(juce::Point<int> pos);
  void copyToClipboard(const juce::String& text);
  void leaveRoom();
  void showLogoMenu();
  void showSessionInfoPopup();
  void logout();
  
  // DAW Sync - room code persistence and track synchronization
  juce::String pendingRoomCode;
  juce::String currentSyncRoomCode;
  juce::HashMap<juce::String, int> trackVersions;  // trackId -> version
  juce::Timer* syncPollTimer = nullptr;
  int64_t lastSyncAtMs = 0;
  bool showingSyncConflict = false;
  juce::String conflictTrackId;
  DAWSyncPullResponse lastConflictResponse;
  
  // New UI state for simplified layout
  UIState currentUIState{UIState::InitialView};
  
  // Filter buttons (3x3 grid: Timeframe x Tone x Semantic)
  juce::TextButton filterFreshButton{"Fresh"};
  juce::TextButton filterRecentButton{"Recent"};
  juce::TextButton filterTimelessButton{"Timeless"};
  juce::TextButton filterFunnyButton{"Funny"};
  juce::TextButton filterDeepButton{"Deep"};
  juce::TextButton filterDarkButton{"Dark"};
  juce::TextButton filterTightButton{"Tight"};
  juce::TextButton filterBalancedButton{"Balanced"};
  juce::TextButton filterWildButton{"Wild"};
  
  // Selected filter values
  juce::String selectedTimeframe{"fresh"};
  juce::String selectedTone{"funny"};
  juce::String selectedSemantic{"tight"};
  
  void onFilterButtonClicked(juce::TextButton* button, const juce::String& filterType, const juce::String& value);
  
  // Pack cards (displayed as buttons after generation)
  juce::Array<juce::TextButton*> packCardButtons;
  void clearPackCardButtons();
  void createPackCardButtons();
  
  // FontAudio icon helper
  juce::SharedResourcePointer<fontaudio::IconHelper> fontAudio;
  
  // Filter section icon bounds (for InitialView)
  juce::Rectangle<int> timeframeIconBounds;
  juce::Rectangle<int> toneIconBounds;
  juce::Rectangle<int> semanticIconBounds;
  
  // Authentication and save with retry
  void attemptSaveWithTokenRefresh();
  bool isResponseAuthError(const juce::String& response);
  juce::String currentPackToSave;  // Temporary storage for save retry

  class FileListModel : public juce::ListBoxModel
  {
  public:
    explicit FileListModel(InspireVSTAudioProcessorEditor& ownerRef) : owner(ownerRef) {}

    int getNumRows() override;
    void paintListBoxItem(int row, juce::Graphics& g, int width, int height, bool rowIsSelected) override;

  private:
    InspireVSTAudioProcessorEditor& owner;
  } listModel;

  juce::ThreadPool threadPool{1};

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(InspireVSTAudioProcessorEditor)
};

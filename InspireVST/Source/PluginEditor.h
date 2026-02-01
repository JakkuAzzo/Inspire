#pragma once

#include <juce_gui_extra/juce_gui_extra.h>
#include "PluginProcessor.h"
#include "NetworkClient.h"

class InspireVSTAudioProcessorEditor final : public juce::AudioProcessorEditor
{
public:
  explicit InspireVSTAudioProcessorEditor(InspireVSTAudioProcessor& processor);
  ~InspireVSTAudioProcessorEditor() override;

  void paint(juce::Graphics& g) override;
  void resized() override;

private:
  void startLogin();
  void startJoin();
  void startCreateRoom();
  void refreshFiles();
  void downloadSelected();
  void setStatus(const juce::String& message);
  void setBusy(bool shouldBeBusy);
  void updateFileList(const InspireListResult& result);
  juce::String detectLocalServerUrl();

  void runAsync(std::function<void()> task);

  InspireVSTAudioProcessor& processor;
  InspireNetworkClient client;

  juce::TextEditor serverUrlInput;
  juce::TextEditor roomIdInput;
  juce::TextEditor codeInput;
  juce::TextEditor passwordInput;
  juce::TextButton loginButton{"Login"};
  juce::TextButton joinButton{"Join Room"};
  juce::TextButton createRoomButton{"Create Room"};
  juce::TextButton refreshButton{"Refresh Files"};
  juce::TextButton downloadButton{"Download Selected"};
  juce::Label statusLabel;
  juce::Label tokenLabel;
  juce::ListBox fileList;

  juce::Array<InspireFileItem> files;
  juce::HashMap<juce::String, int64_t> lastSeenUpdates;
  juce::StringArray recentlyUpdated;

  juce::String sessionToken;
  int64_t lastServerTimeMs = 0;
  bool busy = false;

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

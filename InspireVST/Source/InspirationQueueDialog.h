#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_data_structures/juce_data_structures.h>

class InspirationQueueDialog : public juce::Component
{
public:
  InspirationQueueDialog();
  ~InspirationQueueDialog() override;

  void setItems(const juce::var& pack);
  
  void paint(juce::Graphics& g) override;
  void resized() override;
  void mouseDown(const juce::MouseEvent& e) override;

private:
  struct AudioItem
  {
    juce::String title;
    juce::String url;
    juce::String type;  // "sample", "instrumental", "visual", etc.
    juce::Rectangle<int> bounds;
    bool isPlaying = false;
  };

  struct VideoItem
  {
    juce::String title;
    juce::String videoId;
    juce::String channel;
    juce::Rectangle<int> bounds;
  };

  void layoutItems();
  void drawAudioItems(juce::Graphics& g);
  void drawVideoItems(juce::Graphics& g);

  std::vector<AudioItem> audioItems;
  std::vector<VideoItem> videoItems;
  int scrollPos = 0;
  int totalHeight = 0;
};

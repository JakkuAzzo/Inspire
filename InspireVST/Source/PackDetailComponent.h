#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_data_structures/juce_data_structures.h>

class PackDetailComponent : public juce::Component, public juce::ScrollBar::Listener
{
public:
  class Listener
  {
  public:
    virtual ~Listener() = default;
    virtual void wordChipClicked(const juce::String& word) {}
    virtual void lyricFragmentClicked(const juce::String& fragment) {}
    virtual void flowPromptClicked(const juce::String& prompt) {}
    virtual void addToInspirationClicked(const juce::String& label) {}
    virtual void audioPreviewClicked(const juce::String& url) {}
  };

  PackDetailComponent();
  ~PackDetailComponent() override;

  void setPack(const juce::var& pack);
  void addListener(Listener* listener) { listeners.add(listener); }
  void removeListener(Listener* listener) { listeners.remove(listener); }

  void paint(juce::Graphics& g) override;
  void resized() override;
  void mouseDown(const juce::MouseEvent& e) override;
  void scrollBarMoved(juce::ScrollBar* scrollBarThatHasMoved, double newRangeStart) override;

private:
  struct WordChip
  {
    juce::String word;
    juce::Rectangle<int> bounds;
  };

  struct SectionHeader
  {
    juce::String title;
    juce::Rectangle<int> bounds;  // Clickable area for expand/collapse
  };

  struct AudioItem
  {
    juce::String title;
    juce::String url;
    juce::Rectangle<int> bounds;  // Play button bounds
  };

  struct Section
  {
    juce::String title;
    std::vector<juce::String> items;
    std::vector<AudioItem> audioItems;  // For audio samples with URLs
    int yPos = 0;
    int height = 0;
    bool isExpanded = true;
  };

  void rebuildLayout();
  void drawSection(juce::Graphics& g, const Section& section, int& yPos);
  void drawWordChipsSection(juce::Graphics& g, const std::vector<juce::String>& words, int& yPos, int padding, int maxWidth);

  juce::var currentPack;
  std::vector<Section> sections;
  std::vector<WordChip> wordChips;
  std::vector<SectionHeader> sectionHeaders;  // Track header click areas
  std::vector<AudioItem> audioItems;  // Track audio play button areas
  juce::ListenerList<Listener> listeners;
  std::unique_ptr<juce::ScrollBar> scrollBar;
  double scrollPos = 0.0;
  int totalContentHeight = 0;
};

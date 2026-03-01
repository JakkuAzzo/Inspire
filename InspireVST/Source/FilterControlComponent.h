#pragma once

#include <juce_gui_basics/juce_gui_basics.h>

struct RelevanceFilter
{
  juce::String timeframe = "fresh";   // "fresh", "recent", "timeless"
  juce::String tone = "funny";        // "funny", "deep", "dark"
  juce::String semantic = "tight";    // "tight", "balanced", "wild"
};

class FilterControlComponent : public juce::Component
{
public:
  using FilterChangedCallback = std::function<void(const RelevanceFilter&)>;

  FilterControlComponent();
  ~FilterControlComponent() override;

  void paint(juce::Graphics& g) override;
  void resized() override;

  void setFilter(const RelevanceFilter& filter);
  RelevanceFilter getFilter() const { return currentFilter; }
  
  void setOnFilterChanged(FilterChangedCallback callback) { onFilterChanged = std::move(callback); }

private:
  struct FilterButton : public juce::Component
  {
    FilterButton(const juce::String& labelText, bool isActive, std::function<void()> onClickFunc);
    void paint(juce::Graphics& g) override;
    void mouseDown(const juce::MouseEvent&) override;

    juce::String label;
    juce::String helper;
    bool active = false;
    std::function<void()> onClick;
  };

  void updateButtonStates();

  RelevanceFilter currentFilter;
  FilterChangedCallback onFilterChanged;

  // Timeframe buttons
  std::unique_ptr<FilterButton> freshButton;
  std::unique_ptr<FilterButton> recentButton;
  std::unique_ptr<FilterButton> timelessButton;

  // Tone buttons
  std::unique_ptr<FilterButton> funnyButton;
  std::unique_ptr<FilterButton> deepButton;
  std::unique_ptr<FilterButton> darkButton;

  // Semantic buttons
  std::unique_ptr<FilterButton> tightButton;
  std::unique_ptr<FilterButton> balancedButton;
  std::unique_ptr<FilterButton> wildButton;
};

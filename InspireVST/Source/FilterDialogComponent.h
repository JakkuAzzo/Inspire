#pragma once

#include <juce_gui_basics/juce_gui_basics.h>

struct FilterParams
{
  juce::String timeframe;  // "fresh", "recent", "timeless"
  juce::String tone;       // "funny", "deep", "dark"
  juce::String semantic;   // "tight", "balanced", "wild"
  juce::String mood;       // optional mood parameter
};

class FilterDialogComponent : public juce::Component
{
public:
  class Listener
  {
  public:
    virtual ~Listener() = default;
    virtual void filtersApplied(const FilterParams& params) {}
  };

  FilterDialogComponent();
  ~FilterDialogComponent() override;

  void paint(juce::Graphics& g) override;
  void resized() override;
  void mouseDown(const juce::MouseEvent& e) override;

  void addListener(Listener* listener) { listeners.add(listener); }
  void removeListener(Listener* listener) { listeners.remove(listener); }

  FilterParams getSelectedFilters() const;

private:
  void drawFilterButton(juce::Graphics& g, const juce::String& label, juce::Rectangle<int> bounds, bool isSelected, juce::Colour color);
  void rebuildLayout();

  // Timeframe buttons
  juce::String selectedTimeframe = "fresh";
  juce::Rectangle<int> freshBounds, recentBounds, timelessBounds;

  // Tone buttons
  juce::String selectedTone = "funny";
  juce::Rectangle<int> funnyBounds, deepBounds, darkBounds;

  // Semantic buttons
  juce::String selectedSemantic = "tight";
  juce::Rectangle<int> tightBounds, balancedBounds, wildBounds;

  // Apply/Cancel buttons
  juce::Rectangle<int> applyBounds, cancelBounds;

  juce::ListenerList<Listener> listeners;
};

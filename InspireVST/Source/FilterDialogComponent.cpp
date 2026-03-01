#include "FilterDialogComponent.h"

FilterDialogComponent::FilterDialogComponent()
{
  rebuildLayout();
}

FilterDialogComponent::~FilterDialogComponent() = default;

void FilterDialogComponent::rebuildLayout()
{
  const int padding = 16;
  const int btnW = 80;
  const int btnH = 36;
  const int spacing = 8;
  const int groupSpacing = 20;

  int y = padding;

  // Timeframe section
  int x = padding;
  freshBounds = juce::Rectangle<int>(x, y, btnW, btnH);
  x += btnW + spacing;
  recentBounds = juce::Rectangle<int>(x, y, btnW, btnH);
  x += btnW + spacing;
  timelessBounds = juce::Rectangle<int>(x, y, btnW, btnH);
  y += btnH + groupSpacing;

  // Tone section
  x = padding;
  funnyBounds = juce::Rectangle<int>(x, y, btnW, btnH);
  x += btnW + spacing;
  deepBounds = juce::Rectangle<int>(x, y, btnW, btnH);
  x += btnW + spacing;
  darkBounds = juce::Rectangle<int>(x, y, btnW, btnH);
  y += btnH + groupSpacing;

  // Semantic section
  x = padding;
  tightBounds = juce::Rectangle<int>(x, y, btnW, btnH);
  x += btnW + spacing;
  balancedBounds = juce::Rectangle<int>(x, y, btnW, btnH);
  x += btnW + spacing;
  wildBounds = juce::Rectangle<int>(x, y, btnW, btnH);
  y += btnH + groupSpacing + 8;

  // Apply/Cancel buttons
  applyBounds = juce::Rectangle<int>(padding, y, 100, 36);
  cancelBounds = juce::Rectangle<int>(padding + 110, y, 100, 36);
}

void FilterDialogComponent::paint(juce::Graphics& g)
{
  // Background
  g.fillAll(juce::Colour(6, 12, 24).withAlpha(0.98f));
  
  // Border
  g.setColour(juce::Colour(34, 211, 238).withAlpha(0.3f));
  g.drawRect(getLocalBounds(), 1.0f);

  // Labels
  g.setColour(juce::Colour(148, 163, 184).withAlpha(0.8f));
  g.setFont(juce::Font(juce::FontOptions(11.0f)));
  g.drawText("Timeframe:", 0, freshBounds.getY() - 18, 100, 16, juce::Justification::topLeft);
  g.drawText("Tone:", 0, funnyBounds.getY() - 18, 100, 16, juce::Justification::topLeft);
  g.drawText("Semantic:", 0, tightBounds.getY() - 18, 100, 16, juce::Justification::topLeft);

  // Timeframe buttons
  drawFilterButton(g, "Fresh", freshBounds, selectedTimeframe == "fresh",
                   juce::Colour(34, 211, 238));
  drawFilterButton(g, "Recent", recentBounds, selectedTimeframe == "recent",
                   juce::Colour(34, 211, 238));
  drawFilterButton(g, "Timeless", timelessBounds, selectedTimeframe == "timeless",
                   juce::Colour(34, 211, 238));

  // Tone buttons
  drawFilterButton(g, "Funny", funnyBounds, selectedTone == "funny",
                   juce::Colour(236, 72, 153));
  drawFilterButton(g, "Deep", deepBounds, selectedTone == "deep",
                   juce::Colour(236, 72, 153));
  drawFilterButton(g, "Dark", darkBounds, selectedTone == "dark",
                   juce::Colour(236, 72, 153));

  // Semantic buttons
  drawFilterButton(g, "Tight", tightBounds, selectedSemantic == "tight",
                   juce::Colour(168, 85, 247));
  drawFilterButton(g, "Balanced", balancedBounds, selectedSemantic == "balanced",
                   juce::Colour(168, 85, 247));
  drawFilterButton(g, "Wild", wildBounds, selectedSemantic == "wild",
                   juce::Colour(168, 85, 247));

  // Apply button
  g.setColour(juce::Colour(34, 211, 238).withAlpha(0.8f));
  g.fillRoundedRectangle(applyBounds.toFloat(), 4.0f);
  g.setColour(juce::Colour(6, 12, 24));
  g.setFont(juce::Font(juce::FontOptions(12.0f)));
  g.drawText("Generate", applyBounds, juce::Justification::centred);

  // Cancel button
  g.setColour(juce::Colour(100, 116, 139).withAlpha(0.6f));
  g.fillRoundedRectangle(cancelBounds.toFloat(), 4.0f);
  g.setColour(juce::Colour(241, 245, 255).withAlpha(0.8f));
  g.drawText("Close", cancelBounds, juce::Justification::centred);
}

void FilterDialogComponent::drawFilterButton(juce::Graphics& g, const juce::String& label,
                                            juce::Rectangle<int> bounds, bool isSelected,
                                            juce::Colour color)
{
  if (isSelected)
  {
    g.setColour(color.withAlpha(0.9f));
    g.fillRoundedRectangle(bounds.toFloat(), 4.0f);
    g.setColour(juce::Colour(6, 12, 24));
  }
  else
  {
    g.setColour(color.withAlpha(0.3f));
    g.fillRoundedRectangle(bounds.toFloat(), 4.0f);
    g.setColour(color.withAlpha(0.7f));
    g.drawRoundedRectangle(bounds.toFloat(), 4.0f, 1.0f);
  }

  g.setFont(juce::Font(juce::FontOptions(11.0f)));
  g.drawText(label, bounds, juce::Justification::centred);
}

void FilterDialogComponent::resized()
{
  rebuildLayout();
}

void FilterDialogComponent::mouseDown(const juce::MouseEvent& e)
{
  // Timeframe selection
  if (freshBounds.contains(e.getPosition()))
    selectedTimeframe = "fresh";
  else if (recentBounds.contains(e.getPosition()))
    selectedTimeframe = "recent";
  else if (timelessBounds.contains(e.getPosition()))
    selectedTimeframe = "timeless";

  // Tone selection
  else if (funnyBounds.contains(e.getPosition()))
    selectedTone = "funny";
  else if (deepBounds.contains(e.getPosition()))
    selectedTone = "deep";
  else if (darkBounds.contains(e.getPosition()))
    selectedTone = "dark";

  // Semantic selection
  else if (tightBounds.contains(e.getPosition()))
    selectedSemantic = "tight";
  else if (balancedBounds.contains(e.getPosition()))
    selectedSemantic = "balanced";
  else if (wildBounds.contains(e.getPosition()))
    selectedSemantic = "wild";

  // Apply button
  else if (applyBounds.contains(e.getPosition()))
  {
    FilterParams params;
    params.timeframe = selectedTimeframe;
    params.tone = selectedTone;
    params.semantic = selectedSemantic;
    listeners.call([params](Listener& l) { l.filtersApplied(params); });
  }

  repaint();
}

FilterParams FilterDialogComponent::getSelectedFilters() const
{
  FilterParams params;
  params.timeframe = selectedTimeframe;
  params.tone = selectedTone;
  params.semantic = selectedSemantic;
  return params;
}

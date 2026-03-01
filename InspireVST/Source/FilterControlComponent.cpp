#include "FilterControlComponent.h"

FilterControlComponent::FilterButton::FilterButton(const juce::String& labelText, bool isActive, std::function<void()> onClickFunc)
  : label(labelText), active(isActive), onClick(std::move(onClickFunc))
{
  setSize(60, 32);
}

void FilterControlComponent::FilterButton::paint(juce::Graphics& g)
{
  auto bounds = getLocalBounds().toFloat();
  
  // Background color (cyan for active, semi-transparent for inactive)
  juce::Colour bgColour = active 
    ? juce::Colour(34, 211, 238).withAlpha(0.85f)
    : juce::Colour(34, 211, 238).withAlpha(0.3f);
  
  g.setColour(bgColour);
  g.fillRoundedRectangle(bounds.reduced(1.0f), 4.0f);
  
  // Border
  g.setColour(juce::Colour(34, 211, 238).withAlpha(0.5f));
  g.drawRoundedRectangle(bounds.reduced(1.0f), 4.0f, 1.0f);
  
  // Text (white for active, semi-transparent white for inactive)
  g.setColour(juce::Colour(241, 245, 255).withAlpha(active ? 1.0f : 0.7f));
  g.setFont(juce::Font(juce::FontOptions(11.0f).withKerningFactor(0.02f)));
  g.drawText(label, bounds.toNearestInt(), juce::Justification::centred);
}

void FilterControlComponent::FilterButton::mouseDown(const juce::MouseEvent&)
{
  if (onClick)
    onClick();
}

FilterControlComponent::FilterControlComponent()
{
  // Create timeframe buttons
  freshButton = std::make_unique<FilterButton>("Fresh", true, [this] {
    currentFilter.timeframe = "fresh";
    updateButtonStates();
    if (onFilterChanged) onFilterChanged(currentFilter);
  });
  addAndMakeVisible(*freshButton);
  
  recentButton = std::make_unique<FilterButton>("Recent", false, [this] {
    currentFilter.timeframe = "recent";
    updateButtonStates();
    if (onFilterChanged) onFilterChanged(currentFilter);
  });
  addAndMakeVisible(*recentButton);
  
  timelessButton = std::make_unique<FilterButton>("Timeless", false, [this] {
    currentFilter.timeframe = "timeless";
    updateButtonStates();
    if (onFilterChanged) onFilterChanged(currentFilter);
  });
  addAndMakeVisible(*timelessButton);

  // Create tone buttons
  funnyButton = std::make_unique<FilterButton>("Funny", true, [this] {
    currentFilter.tone = "funny";
    updateButtonStates();
    if (onFilterChanged) onFilterChanged(currentFilter);
  });
  addAndMakeVisible(*funnyButton);
  
  deepButton = std::make_unique<FilterButton>("Deep", false, [this] {
    currentFilter.tone = "deep";
    updateButtonStates();
    if (onFilterChanged) onFilterChanged(currentFilter);
  });
  addAndMakeVisible(*deepButton);
  
  darkButton = std::make_unique<FilterButton>("Dark", false, [this] {
    currentFilter.tone = "dark";
    updateButtonStates();
    if (onFilterChanged) onFilterChanged(currentFilter);
  });
  addAndMakeVisible(*darkButton);

  // Create semantic buttons
  tightButton = std::make_unique<FilterButton>("Tight", true, [this] {
    currentFilter.semantic = "tight";
    updateButtonStates();
    if (onFilterChanged) onFilterChanged(currentFilter);
  });
  addAndMakeVisible(*tightButton);
  
  balancedButton = std::make_unique<FilterButton>("Balanced", false, [this] {
    currentFilter.semantic = "balanced";
    updateButtonStates();
    if (onFilterChanged) onFilterChanged(currentFilter);
  });
  addAndMakeVisible(*balancedButton);
  
  wildButton = std::make_unique<FilterButton>("Wild", false, [this] {
    currentFilter.semantic = "wild";
    updateButtonStates();
    if (onFilterChanged) onFilterChanged(currentFilter);
  });
  addAndMakeVisible(*wildButton);
}

FilterControlComponent::~FilterControlComponent() = default;

void FilterControlComponent::paint(juce::Graphics& g)
{
  // Semi-transparent background to indicate filter panel
  const int cornerRadius = 8;
  g.setColour(juce::Colour(10, 16, 37).withAlpha(0.3f));
  g.fillRoundedRectangle(getLocalBounds().toFloat(), cornerRadius);
  
  g.setColour(juce::Colour(148, 163, 184).withAlpha(0.15f));
  g.drawRoundedRectangle(getLocalBounds().toFloat().reduced(0.5f), cornerRadius, 1.0f);
}

void FilterControlComponent::resized()
{
  const int padding = 8;
  const int btnHeight = 28;
  const int btnWidth = 70;
  const int btnGap = 6;
  const int rowGap = 4;
  const int labelWidth = 70;
  
  int yPos = padding;
  
  // Timeframe row
  int x = padding + labelWidth + 4;
  freshButton->setBounds(x, yPos, btnWidth, btnHeight);
  x += btnWidth + btnGap;
  recentButton->setBounds(x, yPos, btnWidth, btnHeight);
  x += btnWidth + btnGap;
  timelessButton->setBounds(x, yPos, btnWidth, btnHeight);
  yPos += btnHeight + rowGap;
  
  // Tone row
  x = padding + labelWidth + 4;
  funnyButton->setBounds(x, yPos, btnWidth, btnHeight);
  x += btnWidth + btnGap;
  deepButton->setBounds(x, yPos, btnWidth, btnHeight);
  x += btnWidth + btnGap;
  darkButton->setBounds(x, yPos, btnWidth, btnHeight);
  yPos += btnHeight + rowGap;
  
  // Semantic row
  x = padding + labelWidth + 4;
  tightButton->setBounds(x, yPos, btnWidth, btnHeight);
  x += btnWidth + btnGap;
  balancedButton->setBounds(x, yPos, btnWidth, btnHeight);
  x += btnWidth + btnGap;
  wildButton->setBounds(x, yPos, btnWidth, btnHeight);
}

void FilterControlComponent::setFilter(const RelevanceFilter& filter)
{
  currentFilter = filter;
  updateButtonStates();
}

void FilterControlComponent::updateButtonStates()
{
  // Update timeframe buttons
  freshButton->active = (currentFilter.timeframe == "fresh");
  recentButton->active = (currentFilter.timeframe == "recent");
  timelessButton->active = (currentFilter.timeframe == "timeless");
  
  // Update tone buttons
  funnyButton->active = (currentFilter.tone == "funny");
  deepButton->active = (currentFilter.tone == "deep");
  darkButton->active = (currentFilter.tone == "dark");
  
  // Update semantic buttons
  tightButton->active = (currentFilter.semantic == "tight");
  balancedButton->active = (currentFilter.semantic == "balanced");
  wildButton->active = (currentFilter.semantic == "wild");
  
  repaint();
}

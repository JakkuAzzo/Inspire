#include "SuggestionPopupComponent.h"

SuggestionPopupComponent::SuggestionPopupComponent()
{
  setOpaque(false);
  setWantsKeyboardFocus(true);
}

SuggestionPopupComponent::~SuggestionPopupComponent() = default;

void SuggestionPopupComponent::setSuggestions(const std::vector<Suggestion>& suggestions)
{
  suggestionButtons.clear();
  
  for (size_t i = 0; i < suggestions.size(); ++i)
  {
    SuggestionButton sb;
    sb.text = suggestions[i].text;
    sb.type = suggestions[i].type;
    
    sb.button = std::make_unique<juce::TextButton>(suggestions[i].text);
    sb.button->addListener(this);
    addAndMakeVisible(*sb.button);
    
    suggestionButtons.push_back(std::move(sb));
  }
  
  resized();
  repaint();
}

void SuggestionPopupComponent::paint(juce::Graphics& g)
{
  // Popup background with border
  g.fillAll(juce::Colour(20, 25, 50).withAlpha(0.95f));
  g.setColour(juce::Colour(34, 211, 238).withAlpha(0.6f));
  g.drawRect(0.0f, 0.0f, (float)getWidth(), (float)getHeight(), 1.0f);
  
  // Title
  g.setColour(juce::Colour(34, 211, 238).withAlpha(0.9f));
  g.setFont(juce::Font(juce::FontOptions(12.0f).withHeight(13.0f)).boldened());
  g.drawText("Suggestions", contentPadding, 4, getWidth() - contentPadding * 2, suggestionHeight - 8, juce::Justification::centredTop);
}

void SuggestionPopupComponent::resized()
{
  int yPos = suggestionHeight + spacing;
  
  for (auto& sb : suggestionButtons)
  {
    sb.button->setBounds(contentPadding, yPos, getWidth() - contentPadding * 2, suggestionHeight);
    yPos += suggestionHeight + spacing;
  }
}

void SuggestionPopupComponent::showAt(int x, int y)
{
  popupX = x;
  popupY = y;
  
  int width = 220;
  int height = suggestionHeight + (int)(suggestionButtons.size()) * (suggestionHeight + spacing) + spacing + contentPadding;
  
  setBounds(popupX, popupY, width, height);
  setVisible(true);
  toFront(true);
}

void SuggestionPopupComponent::dismissPopup()
{
  setVisible(false);
}

void SuggestionPopupComponent::buttonClicked(juce::Button* button)
{
  // Find which suggestion was clicked
  for (const auto& sb : suggestionButtons)
  {
    if (sb.button.get() == button)
    {
      listeners.call([&](Listener& l) { l.suggestionClicked(sb.text, sb.type); });
      dismissPopup();
      return;
    }
  }
}

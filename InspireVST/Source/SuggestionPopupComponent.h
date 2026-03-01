#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <vector>

class SuggestionPopupComponent : public juce::Component,
                                 public juce::Button::Listener
{
public:
  struct Suggestion
  {
    juce::String text;
    int type; // 0=Rhyme, 1=Reference, 2=Synonym, 3=Phrase, 4=NewTopic
    juce::String icon;
  };

  class Listener
  {
  public:
    virtual ~Listener() = default;
    virtual void suggestionClicked(const juce::String& text, int type) {}
  };

  SuggestionPopupComponent();
  ~SuggestionPopupComponent() override;

  void setSuggestions(const std::vector<Suggestion>& suggestions);
  void addListener(Listener* listener) { listeners.add(listener); }
  void removeListener(Listener* listener) { listeners.remove(listener); }

  void paint(juce::Graphics& g) override;
  void resized() override;
  void buttonClicked(juce::Button* button) override;

  void showAt(int x, int y);
  void dismissPopup();

private:
  struct SuggestionButton
  {
    std::unique_ptr<juce::TextButton> button;
    juce::String text;
    int type;
  };

  std::vector<SuggestionButton> suggestionButtons;
  juce::ListenerList<Listener> listeners;
  int popupX = 0;
  int popupY = 0;
  const int suggestionHeight = 32;
  const int spacing = 8;
  const int contentPadding = 12;
};

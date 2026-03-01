#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_data_structures/juce_data_structures.h>
#include <vector>
#include <map>

class LyricEditorComponent : public juce::Component, public juce::TextEditor::Listener
{
public:
  struct LineAnalysis
  {
    int lineNumber = 0;
    int syllableCount = 0;
    juce::String lastWord;
    int stressCount = 0;     // stressed syllables
    bool endsWithBreath = false;
    std::vector<int> rhymeLineNumbers; // indices of lines that rhyme with this one
    juce::String meter;      // e.g., "iambic", "trochaic", "unmetered"
  };

  struct SuggestionItem
  {
    enum Type { Rhyme, Reference, Synonym, Phrase, NewTopic };
    Type type;
    juce::String text;
    juce::String context; // additional info
  };

  class Listener
  {
  public:
    virtual ~Listener() = default;
    virtual void lyricTextChanged(const juce::String& newText) {}
    virtual void suggestionSelected(const juce::String& suggestion, int type) {}
  };

  LyricEditorComponent();
  ~LyricEditorComponent() override;

  void setText(const juce::String& text);
  juce::String getText() const;

  void paint(juce::Graphics& g) override;
  void resized() override;
  void mouseDown(const juce::MouseEvent& e) override;

  // TextEditor::Listener override for real-time updates
  void textEditorTextChanged(juce::TextEditor& editor) override;

  void addListener(Listener* listener) { listeners.add(listener); }
  void removeListener(Listener* listener) { listeners.remove(listener); }

private:
  struct HoverWord
  {
    juce::String word;
    juce::Rectangle<int> bounds;
    int lineNumber = 0;
  };

  void analyzeText();
  int countSyllables(const juce::String& word);
  std::vector<SuggestionItem> generateSuggestions(const juce::String& word, int lineNumber);
  void updateRhymeHighlights();
  void drawLineAnalysisPanel(juce::Graphics& g);
  void showSuggestionPopup(const juce::String& word, int lineNumber);

  std::unique_ptr<juce::TextEditor> textEditor;
  std::vector<LineAnalysis> lineAnalyses;
  std::map<int, juce::Colour> rhymeColours; // line number -> highlight color
  std::vector<HoverWord> hoverWords;
  int hoveredLineNumber = -1;
  juce::ListenerList<Listener> listeners;

  // Common rhyme families and suggestions (mock data for now)
  juce::StringArray commonRhymes;
  juce::StringArray inspirationalPhrases;
  juce::StringArray topicalShifts;
};

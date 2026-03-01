#include "LyricEditorComponent.h"

LyricEditorComponent::LyricEditorComponent()
  : textEditor(std::make_unique<juce::TextEditor>())
{
  addAndMakeVisible(*textEditor);
  textEditor->setMultiLine(true);
  textEditor->setReturnKeyStartsNewLine(true);
  textEditor->setScrollbarsShown(true);
  textEditor->setColour(juce::TextEditor::backgroundColourId, juce::Colour(8, 18, 34).withAlpha(0.6f));
  textEditor->setColour(juce::TextEditor::textColourId, juce::Colour(241, 245, 255).withAlpha(0.95f));
  textEditor->setFont(juce::Font(juce::FontOptions(14.0f)));
  textEditor->setColour(juce::TextEditor::outlineColourId, juce::Colour(94, 92, 230).withAlpha(0.12f));
  
  // Add listener for real-time analysis updates
  textEditor->addListener(this);

  // Mock data for suggestions
  commonRhymes = {"light", "night", "sight", "flight", "bright", "right", "might", "tight", "fight", "white"};
  inspirationalPhrases = {"In the silence,", "And then,", "Like a dream,", "But still,", "Forever,", "Always,", "Never again,", "One more time,"};
  topicalShifts = {"New topic: struggle", "New topic: hope", "New topic: love", "New topic: freedom", "New topic: identity"};
}

LyricEditorComponent::~LyricEditorComponent() = default;

void LyricEditorComponent::setText(const juce::String& text)
{
  textEditor->setText(text);
  analyzeText();
}

juce::String LyricEditorComponent::getText() const
{
  return textEditor->getText();
}

void LyricEditorComponent::paint(juce::Graphics& g)
{
  // Draw line analysis panel on left
  drawLineAnalysisPanel(g);

  // Draw rhyme highlights
  int lineNum = 0;
  for (const auto& analysis : lineAnalyses)
  {
    // Note: Rhyme highlighting is displayed in the side panel (drawLineAnalysisPanel)
    // TextEditor doesn't provide easy access to line positions, so we rely on
    // the analysis panel for visual feedback on rhyming lines.
    lineNum++;
  }
}

void LyricEditorComponent::resized()
{
  const int panelW = 120;
  textEditor->setBounds(panelW + 8, 0, getWidth() - panelW - 8, getHeight());
}

void LyricEditorComponent::mouseDown(const juce::MouseEvent& e)
{
  // Find which word was clicked
  for (const auto& hw : hoverWords)
  {
    if (hw.bounds.contains(e.getPosition()))
    {
      showSuggestionPopup(hw.word, hw.lineNumber);
      return;
    }
  }
}

void LyricEditorComponent::analyzeText()
{
  lineAnalyses.clear();
  rhymeColours.clear();
  hoverWords.clear();

  juce::String text = textEditor->getText();
  juce::StringArray lines;
  lines.addLines(text);

  // Analyze each line
  for (int i = 0; i < lines.size(); ++i)
  {
    LineAnalysis analysis;
    analysis.lineNumber = i;
    analysis.syllableCount = 0;

    juce::String line = lines[i];
    juce::StringArray words;
    words.addTokens(line, " ", "\"");

    for (const auto& word : words)
    {
      analysis.syllableCount += countSyllables(word);
      if (!word.isEmpty())
        analysis.lastWord = word;
    }

    // Detect breath marks (comma, period, ellipsis at end)
    analysis.endsWithBreath = line.endsWithChar(',') || line.endsWithChar('.') || line.contains("...");

    // Basic meter detection (heuristic)
    if (analysis.syllableCount >= 8 && analysis.syllableCount <= 12)
      analysis.meter = "iambic";
    else if (analysis.syllableCount < 8)
      analysis.meter = "trochaic";
    else
      analysis.meter = "unmetered";

    lineAnalyses.push_back(analysis);
  }

  // Detect rhymes
  updateRhymeHighlights();
  repaint();
}

int LyricEditorComponent::countSyllables(const juce::String& word)
{
  juce::String lower = word.toLowerCase();
  int count = 0;
  bool previousWasVowel = false;

  for (int i = 0; i < lower.length(); ++i)
  {
    juce::juce_wchar c = lower[i];
    bool isVowel = (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u' || c == 'y');

    if (isVowel && !previousWasVowel)
      count++;

    previousWasVowel = isVowel;
  }

  // Adjust for silent e
  if (lower.endsWithChar('e'))
    count--;

  // At least 1 syllable per word
  return juce::jmax(1, count);
}

std::vector<LyricEditorComponent::SuggestionItem> LyricEditorComponent::generateSuggestions(const juce::String& word, int lineNumber)
{
  std::vector<SuggestionItem> suggestions;

  // Rhyme suggestions
  for (const auto& r : commonRhymes)
  {
    suggestions.push_back({SuggestionItem::Rhyme, r, "rhyme"});
  }

  // Synonym/reference suggestions (mock)
  suggestions.push_back({SuggestionItem::Reference, "Compare to: dreams", "reference"});
  suggestions.push_back({SuggestionItem::Synonym, "Similar word: glow", "synonym"});

  // Phrase suggestions
  for (const auto& phrase : inspirationalPhrases)
  {
    suggestions.push_back({SuggestionItem::Phrase, phrase, "phrase starter"});
  }

  // Topic shift suggestions
  for (const auto& topic : topicalShifts)
  {
    suggestions.push_back({SuggestionItem::NewTopic, topic, "shift"});
  }

  return suggestions;
}

void LyricEditorComponent::updateRhymeHighlights()
{
  juce::Colour rhymeColors[] = {
    juce::Colour(236, 72, 153),   // pink
    juce::Colour(34, 211, 238),   // cyan
    juce::Colour(168, 85, 247),   // purple
    juce::Colour(59, 130, 246),   // blue
  };

  for (int i = 0; i < static_cast<int>(lineAnalyses.size()); ++i)
  {
    auto& analysis = lineAnalyses[i];

    // Simple rhyme detection: last 2-3 characters of last word
    if (analysis.lastWord.length() > 2)
    {
      juce::String ending = analysis.lastWord.substring(analysis.lastWord.length() - 3).toLowerCase();

      for (int j = i + 1; j < static_cast<int>(lineAnalyses.size()); ++j)
      {
        auto& otherAnalysis = lineAnalyses[j];
        if (otherAnalysis.lastWord.length() > 2)
        {
          juce::String otherEnding = otherAnalysis.lastWord.substring(otherAnalysis.lastWord.length() - 3).toLowerCase();

          if (ending == otherEnding || analysis.lastWord.endsWith(otherAnalysis.lastWord.substring(1)))
          {
            analysis.rhymeLineNumbers.push_back(j);
            otherAnalysis.rhymeLineNumbers.push_back(i);
            juce::Colour color = rhymeColors[i % 4];
            rhymeColours[i] = color;
            rhymeColours[j] = color;
          }
        }
      }
    }
  }
}

void LyricEditorComponent::drawLineAnalysisPanel(juce::Graphics& g)
{
  const int panelW = 120;
  g.fillAll(juce::Colour(6, 12, 24).withAlpha(0.5f));
  g.setColour(juce::Colour(94, 92, 230).withAlpha(0.2f));
  g.drawVerticalLine(panelW, 0.0f, (float)getHeight());

  g.setColour(juce::Colour(148, 163, 184).withAlpha(0.6f));
  g.setFont(juce::Font(juce::FontOptions(9.0f)));

  int y = 4;
  for (int i = 0; i < static_cast<int>(lineAnalyses.size()) && y < getHeight() - 20; ++i)
  {
    const auto& analysis = lineAnalyses[i];

    // Draw syllable count
    juce::String syllText = juce::String(analysis.syllableCount) + "s";
    g.drawText(syllText, 4, y, 40, 16, juce::Justification::centredLeft);

    // Draw meter abbreviation
    juce::String meterText = analysis.meter.substring(0, 3);
    g.drawText(meterText, 48, y, 40, 16, juce::Justification::centredLeft);

    // Draw breath mark if present
    if (analysis.endsWithBreath)
    {
      g.setColour(juce::Colour(34, 211, 238).withAlpha(0.7f));
      g.fillEllipse(juce::Rectangle<float>(100, y + 6, 8, 8));
      g.setColour(juce::Colour(148, 163, 184).withAlpha(0.6f));
    }

    // Draw rhyme indicator
    if (!analysis.rhymeLineNumbers.empty())
    {
      g.setColour(rhymeColours[i].withAlpha(0.8f));
      g.drawRect(2, y - 2, panelW - 4, 18, 2);
    }

    y += 20;
  }
}

void LyricEditorComponent::showSuggestionPopup(const juce::String& word, int lineNumber)
{
  auto suggestions = generateSuggestions(word, lineNumber);

  // Create a simple alert showing suggestions
  juce::String suggestionText = "Suggestions for \"" + word + "\":\n\n";

  for (const auto& s : suggestions)
  {
    switch (s.type)
    {
    case SuggestionItem::Rhyme:
      suggestionText += "RHYME: " + s.text + "\n";
      break;
    case SuggestionItem::Reference:
      suggestionText += "REF: " + s.text + "\n";
      break;
    case SuggestionItem::Synonym:
      suggestionText += "SYN: " + s.text + "\n";
      break;
    case SuggestionItem::Phrase:
      suggestionText += "PHRASE: " + s.text + "\n";
      break;
    case SuggestionItem::NewTopic:
      suggestionText += "TOPIC: " + s.text + "\n";
      break;
    }
  }

  juce::AlertWindow::showMessageBoxAsync(juce::AlertWindow::InfoIcon, "Suggestions", suggestionText, "Close");
}

void LyricEditorComponent::textEditorTextChanged(juce::TextEditor& editor)
{
  // Re-analyze the text whenever it changes for real-time metric updates
  if (&editor == textEditor.get())
  {
    analyzeText();
  }
}

#include "PluginEditor.h"

// PackDetailListener method implementations
void InspireVSTAudioProcessorEditor::PackDetailListener::wordChipClicked(const juce::String& word)
{
  if (owner.lyricEditorComponent)
  {
    // Get current text, insert word at cursor
    auto currentText = owner.lyricEditorComponent->getText();
    if (currentText.isNotEmpty() && !currentText.endsWithIgnoreCase(" "))
    {
      currentText += " ";
    }
    owner.lyricEditorComponent->setText(currentText + word);
  }
}

void InspireVSTAudioProcessorEditor::PackDetailListener::lyricFragmentClicked(const juce::String& fragment)
{
  if (owner.lyricEditorComponent)
  {
    auto currentText = owner.lyricEditorComponent->getText();
    if (currentText.isNotEmpty() && !currentText.endsWithIgnoreCase(" "))
    {
      currentText += " ";
    }
    owner.lyricEditorComponent->setText(currentText + fragment);
  }
}

void InspireVSTAudioProcessorEditor::PackDetailListener::flowPromptClicked(const juce::String& prompt)
{
  // Flow prompt is usually a suggestion, display in status
  owner.setStatus("Flow Prompt: " + prompt);
}

void InspireVSTAudioProcessorEditor::PackDetailListener::addToInspirationClicked(const juce::String& label)
{
  if (owner.currentDisplayedPack.isObject())
  {
    owner.addToInspirationQueue(owner.currentDisplayedPack);
  }
}

void InspireVSTAudioProcessorEditor::PackDetailListener::audioPreviewClicked(const juce::String& url)
{
  // Trigger audio preview download/play
  owner.loadPreviewFromUrlAsync(url);
}

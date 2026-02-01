#include "PluginProcessor.h"
#include "PluginEditor.h"

InspireVSTAudioProcessor::InspireVSTAudioProcessor()
{
  // Initialize with default properties (input/output channels, etc.)
}

InspireVSTAudioProcessor::~InspireVSTAudioProcessor() = default;

const juce::String InspireVSTAudioProcessor::getName() const
{
  return "InspireVST";
}

bool InspireVSTAudioProcessor::hasEditor() const
{
  return true;
}

juce::AudioProcessorEditor* InspireVSTAudioProcessor::createEditor()
{
  return new InspireVSTAudioProcessorEditor(*this);
}

void InspireVSTAudioProcessor::prepareToPlay(double, int)
{
}

void InspireVSTAudioProcessor::releaseResources()
{
}

void InspireVSTAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
  buffer.clear();
}

void InspireVSTAudioProcessor::processBlock(juce::AudioBuffer<double>& buffer, juce::MidiBuffer&)
{
  buffer.clear();
}

int InspireVSTAudioProcessor::getNumPrograms()
{
  return 1;
}

int InspireVSTAudioProcessor::getCurrentProgram()
{
  return 0;
}

void InspireVSTAudioProcessor::setCurrentProgram(int)
{
}

const juce::String InspireVSTAudioProcessor::getProgramName(int)
{
  return {};
}

void InspireVSTAudioProcessor::changeProgramName(int, const juce::String&)
{
}

void InspireVSTAudioProcessor::getStateInformation(juce::MemoryBlock& destData)
{
  juce::MemoryOutputStream stream(destData, true);
  stream.writeString("v1");
}

void InspireVSTAudioProcessor::setStateInformation(const void*, int)
{
}

double InspireVSTAudioProcessor::getTailLengthSeconds() const
{
  return 0.0;
}

// REQUIRED BY JUCE VST3: Factory function to create the plugin instance
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
  return new InspireVSTAudioProcessor();
}

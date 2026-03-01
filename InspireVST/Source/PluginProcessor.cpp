#include "PluginProcessor.h"
#include "PluginEditor.h"
#include <atomic>

// file-scope storage for host transport snapshot
static InspireVSTAudioProcessor::HostTransportInfo hostInfo;

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
  // Sample-time processing not used; clear buffer
  buffer.clear();

  // Snapshot host transport info if available
  if (auto* ph = getPlayHead())
  {
    if (auto pos = ph->getPosition())
    {
      // Individual fields are Optional; only copy when provided by host
      if (auto ppq = pos->getPpqPosition())
        hostInfo.ppqPosition = *ppq;

      if (auto lastBar = pos->getPpqPositionOfLastBarStart())
        hostInfo.ppqPositionOfLastBarStart = *lastBar;

      if (auto bpm = pos->getBpm())
        hostInfo.bpm = *bpm;

      if (auto ts = pos->getTimeSignature())
      {
        hostInfo.timeSigNumerator = ts->numerator;
        hostInfo.timeSigDenominator = ts->denominator;
      }

      if (auto samples = pos->getTimeInSamples())
        hostInfo.samplePosition = static_cast<double>(*samples);

      hostInfo.isPlaying = pos->getIsPlaying();
    }
  }
}

void InspireVSTAudioProcessor::processBlock(juce::AudioBuffer<double>& buffer, juce::MidiBuffer&)
{
  buffer.clear();

  if (auto* ph = getPlayHead())
  {
    if (auto pos = ph->getPosition())
    {
      if (auto ppq = pos->getPpqPosition())
        hostInfo.ppqPosition = *ppq;

      if (auto lastBar = pos->getPpqPositionOfLastBarStart())
        hostInfo.ppqPositionOfLastBarStart = *lastBar;

      if (auto bpm = pos->getBpm())
        hostInfo.bpm = *bpm;

      if (auto ts = pos->getTimeSignature())
      {
        hostInfo.timeSigNumerator = ts->numerator;
        hostInfo.timeSigDenominator = ts->denominator;
      }

      if (auto samples = pos->getTimeInSamples())
        hostInfo.samplePosition = static_cast<double>(*samples);

      hostInfo.isPlaying = pos->getIsPlaying();
    }
  }
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

void InspireVSTAudioProcessor::insertPackToDAW(const juce::var& pack)
{
  // Minimal implementation: store the pack in processor state and log
  lastInsertedPack = pack;
  if (auto* obj = pack.getDynamicObject())
  {
    juce::Logger::getCurrentLogger()->writeToLog("[InspireVST] insertPackToDAW: " + obj->getProperty("title").toString());
  }
  else
  {
    juce::Logger::getCurrentLogger()->writeToLog("[InspireVST] insertPackToDAW: pack stored");
  }
}

InspireVSTAudioProcessor::HostTransportInfo InspireVSTAudioProcessor::getHostTransportInfo() const
{
  // Return the last sampled host info; this is updated in processBlock.
  return hostInfo;
}

// (hostInfo declared at file top)

double InspireVSTAudioProcessor::getTailLengthSeconds() const
{
  return 0.0;
}

// REQUIRED BY JUCE VST3: Factory function to create the plugin instance
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
  return new InspireVSTAudioProcessor();
}

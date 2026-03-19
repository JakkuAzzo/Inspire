#include "PluginProcessor.h"
#include "PluginEditor.h"
#include <atomic>
#include <algorithm>

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

void InspireVSTAudioProcessor::prepareToPlay(double sampleRate, int)
{
  currentSampleRate = sampleRate > 0.0 ? sampleRate : 44100.0;
  std::scoped_lock<std::mutex> lock(midiScheduleMutex);
  scheduledMidiEvents.clear();
  midiScheduleCursorSamples = 0;
}

void InspireVSTAudioProcessor::releaseResources()
{
}

void InspireVSTAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
  // Sample-time processing not used; clear buffer
  buffer.clear();

  const int numSamples = buffer.getNumSamples();
  const int64_t blockStart = midiScheduleCursorSamples;
  const int64_t blockEnd = blockStart + numSamples;

  {
    std::scoped_lock<std::mutex> lock(midiScheduleMutex);
    for (const auto& evt : scheduledMidiEvents)
    {
      if (evt.sampleOffset >= blockStart && evt.sampleOffset < blockEnd)
      {
        const int samplePos = static_cast<int>(evt.sampleOffset - blockStart);
        midiMessages.addEvent(evt.message, samplePos);
      }
    }

    scheduledMidiEvents.erase(
      std::remove_if(
        scheduledMidiEvents.begin(),
        scheduledMidiEvents.end(),
        [blockEnd](const ScheduledMidiEvent& evt) { return evt.sampleOffset < blockEnd; }
      ),
      scheduledMidiEvents.end()
    );
  }

  midiScheduleCursorSamples = blockEnd;

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

void InspireVSTAudioProcessor::processBlock(juce::AudioBuffer<double>& buffer, juce::MidiBuffer& midiMessages)
{
  buffer.clear();

  const int numSamples = buffer.getNumSamples();
  const int64_t blockStart = midiScheduleCursorSamples;
  const int64_t blockEnd = blockStart + numSamples;

  {
    std::scoped_lock<std::mutex> lock(midiScheduleMutex);
    for (const auto& evt : scheduledMidiEvents)
    {
      if (evt.sampleOffset >= blockStart && evt.sampleOffset < blockEnd)
      {
        const int samplePos = static_cast<int>(evt.sampleOffset - blockStart);
        midiMessages.addEvent(evt.message, samplePos);
      }
    }

    scheduledMidiEvents.erase(
      std::remove_if(
        scheduledMidiEvents.begin(),
        scheduledMidiEvents.end(),
        [blockEnd](const ScheduledMidiEvent& evt) { return evt.sampleOffset < blockEnd; }
      ),
      scheduledMidiEvents.end()
    );
  }

  midiScheduleCursorSamples = blockEnd;

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
    const auto packType = obj->getProperty("type").toString();
    if (packType == "daw-sync-pull")
    {
      const auto notesJson = obj->getProperty("notesJson").toString();
      const auto bpmVar = obj->getProperty("bpm");
      const double bpm = (bpmVar.isDouble() || bpmVar.isInt()) ? static_cast<double>(bpmVar) : 120.0;
      queuePulledMidiNotesFromJson(notesJson, bpm);
    }
    juce::Logger::getCurrentLogger()->writeToLog("[InspireVST] insertPackToDAW: " + obj->getProperty("title").toString());
  }
  else
  {
    juce::Logger::getCurrentLogger()->writeToLog("[InspireVST] insertPackToDAW: pack stored");
  }
}

void InspireVSTAudioProcessor::queuePulledMidiNotesFromJson(const juce::String& notesJson, double bpm)
{
  if (notesJson.trim().isEmpty())
    return;

  const auto parsed = juce::JSON::parse(notesJson);
  if (!parsed.isArray() || parsed.getArray() == nullptr)
    return;

  const double safeBpm = bpm > 0.0 ? bpm : 120.0;
  const double samplesPerBeat = (60.0 / safeBpm) * currentSampleRate;

  std::vector<ScheduledMidiEvent> incoming;
  for (const auto& noteVar : *parsed.getArray())
  {
    if (!noteVar.isObject())
      continue;
    auto* noteObj = noteVar.getDynamicObject();
    if (noteObj == nullptr)
      continue;

    const auto pitchVar = noteObj->getProperty("pitch");
    const auto velVar = noteObj->getProperty("velocity");
    const auto startVar = noteObj->getProperty("startTime");
    const auto altStartVar = noteObj->getProperty("start_time");
    const auto durVar = noteObj->getProperty("duration");

    const int pitch = (pitchVar.isInt() || pitchVar.isDouble()) ? static_cast<int>(pitchVar) : 60;
    const int velocity = (velVar.isInt() || velVar.isDouble()) ? static_cast<int>(velVar) : 100;
    const double startBeat = (startVar.isDouble() || startVar.isInt())
      ? static_cast<double>(startVar)
      : ((altStartVar.isDouble() || altStartVar.isInt()) ? static_cast<double>(altStartVar) : 0.0);
    const double durationBeats = (durVar.isDouble() || durVar.isInt()) ? static_cast<double>(durVar) : 0.25;

    const int clampedPitch = juce::jlimit(0, 127, pitch);
    const uint8_t clampedVelocity = static_cast<uint8_t>(juce::jlimit(1, 127, velocity));
    const double safeDuration = juce::jmax(0.05, durationBeats);

    const int64_t startSampleOffset = static_cast<int64_t>(std::llround(juce::jmax(0.0, startBeat) * samplesPerBeat));
    const int64_t endSampleOffset = static_cast<int64_t>(std::llround((juce::jmax(0.0, startBeat) + safeDuration) * samplesPerBeat));

    incoming.push_back({ startSampleOffset, juce::MidiMessage::noteOn(1, clampedPitch, clampedVelocity) });
    incoming.push_back({ juce::jmax(startSampleOffset + 1, endSampleOffset), juce::MidiMessage::noteOff(1, clampedPitch) });
  }

  if (incoming.empty())
    return;

  std::scoped_lock<std::mutex> lock(midiScheduleMutex);
  const int64_t base = midiScheduleCursorSamples;
  for (auto& evt : incoming)
  {
    evt.sampleOffset += base;
    scheduledMidiEvents.push_back(evt);
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

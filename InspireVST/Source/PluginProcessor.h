#pragma once

#include <juce_audio_utils/juce_audio_utils.h>

class InspireVSTAudioProcessor final : public juce::AudioProcessor
{
public:
  InspireVSTAudioProcessor();
  ~InspireVSTAudioProcessor() override;

  void prepareToPlay(double sampleRate, int samplesPerBlock) override;
  void releaseResources() override;
  void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
  void processBlock(juce::AudioBuffer<double>&, juce::MidiBuffer&) override;

  juce::AudioProcessorEditor* createEditor() override;
  bool hasEditor() const override;

  const juce::String getName() const override;
  double getTailLengthSeconds() const override;

  int getNumPrograms() override;
  int getCurrentProgram() override;
  void setCurrentProgram(int index) override;
  const juce::String getProgramName(int index) override;
  void changeProgramName(int index, const juce::String& newName) override;

  void getStateInformation(juce::MemoryBlock& destData) override;
  void setStateInformation(const void* data, int sizeInBytes) override;

  // DAW insertion API: called by editor to insert pack content into DAW state
  void insertPackToDAW(const juce::var& pack);

  // Host transport snapshot exposed to editor
  struct HostTransportInfo
  {
    double ppqPosition = 0.0;      // quarter-note position since start
    double ppqPositionOfLastBarStart = 0.0;
    double bpm = 120.0;
    int timeSigNumerator = 4;
    int timeSigDenominator = 4;
    bool isPlaying = false;
    double samplePosition = 0.0;
  };

  HostTransportInfo getHostTransportInfo() const;

  juce::var lastInsertedPack;

  bool acceptsMidi() const override { return true; }
  bool producesMidi() const override { return false; }
  bool isMidiEffect() const override { return false; }
};

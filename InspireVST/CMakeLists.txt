cmake_minimum_required(VERSION 3.18)
project(InspireVST VERSION 0.1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
FetchContent_Declare(
  juce
  GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
  GIT_TAG 8.0.4
)
FetchContent_MakeAvailable(juce)

juce_add_plugin(InspireVST
  COMPANY_NAME "Inspire"
  IS_SYNTH FALSE
  NEEDS_MIDI_INPUT FALSE
  NEEDS_MIDI_OUTPUT FALSE
  IS_MIDI_EFFECT FALSE
  PLUGIN_MANUFACTURER_CODE INSP
  PLUGIN_CODE IVST
  FORMATS VST3 AU
  PRODUCT_NAME "InspireVST"
)

target_sources(InspireVST PRIVATE
  Source/PluginProcessor.cpp
  Source/PluginProcessor.h
  Source/PluginEditor.cpp
  Source/PluginEditor.h
  Source/NetworkClient.cpp
  Source/NetworkClient.h
  Source/FilterControlComponent.cpp
  Source/FilterControlComponent.h
  Source/PackDetailComponent.cpp
  Source/PackDetailComponent.h
  Source/LyricEditorComponent.cpp
  Source/LyricEditorComponent.h
  Source/PackDetailListener.cpp
  Source/SuggestionPopupComponent.cpp
  Source/SuggestionPopupComponent.h
  Source/InspirationQueueDialog.cpp
  Source/InspirationQueueDialog.h
  Source/FilterDialogComponent.cpp
  Source/FilterDialogComponent.h
  Source/FontAudioStandalone.cpp
)

target_include_directories(InspireVST PRIVATE
  ${CMAKE_CURRENT_SOURCE_DIR}/fontaudio/wrappers/juce/module
)

target_compile_definitions(InspireVST PRIVATE
  JUCE_WEB_BROWSER=0
  JUCE_USE_CURL=1
)

target_link_libraries(InspireVST PRIVATE
  juce::juce_audio_utils
  juce::juce_gui_extra
  juce::juce_cryptography
  juce::juce_core
)

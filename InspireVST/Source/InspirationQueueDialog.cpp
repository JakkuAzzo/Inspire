#include "InspirationQueueDialog.h"

InspirationQueueDialog::InspirationQueueDialog()
{
  setOpaque(true);
}

InspirationQueueDialog::~InspirationQueueDialog() = default;

void InspirationQueueDialog::setItems(const juce::var& pack)
{
  audioItems.clear();
  videoItems.clear();
  totalHeight = 0;

  if (!pack.isObject())
    return;

  auto* obj = pack.getDynamicObject();
  if (!obj)
    return;

  // Extract audio samples
  auto sampleVar = obj->getProperty("sample");
  if (sampleVar.isObject())
  {
    auto* sampleObj = sampleVar.getDynamicObject();
    AudioItem item;
    item.title = sampleObj->getProperty("title").toString();
    item.url = sampleObj->getProperty("url").toString();
    item.type = "sample";
    if (item.title.isNotEmpty() && item.url.isNotEmpty())
      audioItems.push_back(item);
  }

  // Extract secondary sample
  auto secondSampleVar = obj->getProperty("secondarySample");
  if (secondSampleVar.isObject())
  {
    auto* sampleObj = secondSampleVar.getDynamicObject();
    AudioItem item;
    item.title = sampleObj->getProperty("title").toString();
    item.url = sampleObj->getProperty("url").toString();
    item.type = "sample";
    if (item.title.isNotEmpty() && item.url.isNotEmpty())
      audioItems.push_back(item);
  }

  // Extract reference instrumentals
  auto clipsVar = obj->getProperty("referenceInstrumentals");
  if (clipsVar.isArray())
  {
    for (auto& clipVar : *clipsVar.getArray())
    {
      if (clipVar.isObject())
      {
        auto* clipObj = clipVar.getDynamicObject();
        AudioItem item;
        item.title = clipObj->getProperty("title").toString();
        item.url = clipObj->getProperty("url").toString();
        item.type = "instrumental";
        if (item.title.isNotEmpty() && item.url.isNotEmpty())
          audioItems.push_back(item);
      }
    }
  }

  // Extract YouTube videos
  auto videosVar = obj->getProperty("youtubeClips");
  if (videosVar.isArray())
  {
    for (auto& videoVar : *videosVar.getArray())
    {
      if (videoVar.isObject())
      {
        auto* videoObj = videoVar.getDynamicObject();
        VideoItem item;
        item.title = videoObj->getProperty("title").toString();
        item.videoId = videoObj->getProperty("videoId").toString();
        item.channel = videoObj->getProperty("channel").toString();
        if (item.title.isNotEmpty() && item.videoId.isNotEmpty())
          videoItems.push_back(item);
      }
    }
  }

  layoutItems();
  repaint();
}

void InspirationQueueDialog::layoutItems()
{
  int y = 16;
  const int padding = 12;
  const int itemHeight = 48;
  const int spacing = 8;

  // Layout audio items
  for (auto& item : audioItems)
  {
    item.bounds = juce::Rectangle<int>(padding, y, getWidth() - padding * 2, itemHeight);
    y += itemHeight + spacing;
  }

  // Layout video items
  for (auto& item : videoItems)
  {
    item.bounds = juce::Rectangle<int>(padding, y, getWidth() - padding * 2, itemHeight);
    y += itemHeight + spacing;
  }

  totalHeight = y;
}

void InspirationQueueDialog::paint(juce::Graphics& g)
{
  // Background
  g.fillAll(juce::Colour(6, 12, 24).withAlpha(0.95f));

  // Header
  g.setColour(juce::Colour(34, 211, 238).withAlpha(0.8f));
  g.setFont(juce::Font(18.0f, juce::Font::bold));
  g.drawText("Inspiration Queue", 12, 8, getWidth() - 24, 28, juce::Justification::centredLeft);

  // Draw audio items
  drawAudioItems(g);

  // Draw video items
  drawVideoItems(g);
}

void InspirationQueueDialog::drawAudioItems(juce::Graphics& g)
{
  g.setFont(juce::Font(juce::FontOptions(13.0f)));
  
  for (const auto& item : audioItems)
  {
    // Draw background
    g.setColour(juce::Colour(25, 45, 65).withAlpha(0.6f));
    g.fillRoundedRectangle(item.bounds.toFloat(), 6.0f);

    // Draw border
    g.setColour(juce::Colour(34, 211, 238).withAlpha(0.3f));
    g.drawRoundedRectangle(item.bounds.toFloat(), 6.0f, 1.0f);

    // Draw title
    g.setColour(juce::Colour(241, 245, 255).withAlpha(0.9f));
    g.drawText(item.title, item.bounds.reduced(8, 6), juce::Justification::centredLeft);

    // Draw play button
    juce::Rectangle<int> playBtn(item.bounds.getRight() - 40, item.bounds.getCentreY() - 16, 32, 32);
    g.setColour(juce::Colour(34, 211, 238).withAlpha(0.7f));
    g.fillRoundedRectangle(playBtn.toFloat(), 4.0f);
    g.setColour(juce::Colour(6, 12, 24));
    g.drawText("▶", playBtn, juce::Justification::centred);
  }
}

void InspirationQueueDialog::drawVideoItems(juce::Graphics& g)
{
  g.setFont(juce::Font(juce::FontOptions(13.0f)));

  for (const auto& item : videoItems)
  {
    // Draw background
    g.setColour(juce::Colour(65, 45, 25).withAlpha(0.6f));
    g.fillRoundedRectangle(item.bounds.toFloat(), 6.0f);

    // Draw border
    g.setColour(juce::Colour(238, 130, 34).withAlpha(0.3f));
    g.drawRoundedRectangle(item.bounds.toFloat(), 6.0f, 1.0f);

    // Draw title and channel
    g.setColour(juce::Colour(241, 245, 255).withAlpha(0.9f));
    juce::Rectangle<int> textArea = item.bounds.reduced(8, 4);
    g.drawText(item.title, textArea.removeFromRight(40), juce::Justification::centredLeft);
    g.setColour(juce::Colour(148, 163, 184).withAlpha(0.7f));
    g.setFont(juce::Font(juce::FontOptions(11.0f)));
    g.drawText(item.channel, textArea, juce::Justification::bottomLeft);

    // Draw play button (YouTube style)
    juce::Rectangle<int> playBtn(item.bounds.getRight() - 40, item.bounds.getCentreY() - 16, 32, 32);
    g.setColour(juce::Colour(238, 130, 34).withAlpha(0.7f));
    g.fillRoundedRectangle(playBtn.toFloat(), 4.0f);
    g.setColour(juce::Colour(6, 12, 24));
    g.drawText("▶", playBtn, juce::Justification::centred);
  }
}

void InspirationQueueDialog::resized()
{
  layoutItems();
}

void InspirationQueueDialog::mouseDown(const juce::MouseEvent& e)
{
  // Handle play button clicks for audio items
  for (auto& item : audioItems)
  {
    juce::Rectangle<int> playBtn(item.bounds.getRight() - 40, item.bounds.getCentreY() - 16, 32, 32);
    if (playBtn.contains(e.getPosition()))
    {
      item.isPlaying = !item.isPlaying;
      repaint();
      // TODO: Trigger audio playback
      return;
    }
  }

  // Handle play button clicks for video items
  for (auto& item : videoItems)
  {
    juce::Rectangle<int> playBtn(item.bounds.getRight() - 40, item.bounds.getCentreY() - 16, 32, 32);
    if (playBtn.contains(e.getPosition()))
    {
      // TODO: Open YouTube video
      return;
    }
  }
}

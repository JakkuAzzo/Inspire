#include "PackDetailComponent.h"

PackDetailComponent::PackDetailComponent()
  : scrollPos(0)
{
  setOpaque(true);
  scrollBar = std::make_unique<juce::ScrollBar>(false);
  scrollBar->addListener(this);
  addAndMakeVisible(*scrollBar);
}

PackDetailComponent::~PackDetailComponent() = default;

void PackDetailComponent::setPack(const juce::var& pack)
{
  currentPack = pack;
  wordChips.clear();
  sections.clear();

  if (!pack.isObject())
    return;

  auto* obj = pack.getDynamicObject();
  if (!obj)
    return;

  // Title section - always visible
  juce::String title = obj->getProperty("title").toString();
  juce::String headline = obj->getProperty("headline").toString();
  juce::String summary = obj->getProperty("summary").toString();
  
  if (title.isNotEmpty())
  {
    Section titleSec;
    titleSec.title = "Overview";
    titleSec.items.push_back(title);
    if (headline.isNotEmpty()) titleSec.items.push_back(headline);
    if (summary.isNotEmpty()) titleSec.items.push_back(summary);
    sections.push_back(titleSec);
  }

  // Audio Samples section (from Producer packs and other modes)
  Section audioSec;
  audioSec.title = "Audio Samples";
  
  // Check for primary sample (Producer mode)
  auto sampleVar = obj->getProperty("sample");
  if (sampleVar.isObject())
  {
    auto* sampleObj = sampleVar.getDynamicObject();
    juce::String sampleTitle = sampleObj->getProperty("title").toString();
    juce::String sampleUrl = sampleObj->getProperty("url").toString();
    if (sampleTitle.isNotEmpty() && sampleUrl.isNotEmpty())
    {
      audioSec.audioItems.push_back({sampleTitle, sampleUrl, {}});
    }
  }
  
  // Check for secondary sample
  auto secondSampleVar = obj->getProperty("secondarySample");
  if (secondSampleVar.isObject())
  {
    auto* sampleObj = secondSampleVar.getDynamicObject();
    juce::String sampleTitle = sampleObj->getProperty("title").toString();
    juce::String sampleUrl = sampleObj->getProperty("url").toString();
    if (sampleTitle.isNotEmpty() && sampleUrl.isNotEmpty())
    {
      audioSec.audioItems.push_back({sampleTitle, sampleUrl, {}});
    }
  }
  
  // Check for reference instrumentals/clips
  auto clipsVar = obj->getProperty("referenceInstrumentals");
  if (clipsVar.isArray())
  {
    for (auto& clipVar : *clipsVar.getArray())
    {
      if (clipVar.isObject())
      {
        auto* clipObj = clipVar.getDynamicObject();
        juce::String clipTitle = clipObj->getProperty("title").toString();
        juce::String clipUrl = clipObj->getProperty("url").toString();
        if (clipTitle.isNotEmpty() && clipUrl.isNotEmpty())
        {
          audioSec.audioItems.push_back({clipTitle, clipUrl, {}});
        }
      }
    }
  }
  
  if (!audioSec.audioItems.empty())
    sections.push_back(audioSec);

  // Power Words section
  auto pwVar = obj->getProperty("powerWords");
  if (pwVar.isArray())
  {
    Section pwSec;
    pwSec.title = "Power Words";
    for (auto& w : *pwVar.getArray())
    {
      juce::String word = w.toString();
      if (word.isNotEmpty())
        pwSec.items.push_back(word);
    }
    if (!pwSec.items.empty())
      sections.push_back(pwSec);
  }

  // Lyric Fragments section
  auto lfVar = obj->getProperty("lyricFragments");
  if (lfVar.isArray())
  {
    Section lfSec;
    lfSec.title = "Lyric Fragments";
    for (auto& l : *lfVar.getArray())
    {
      juce::String frag = l.toString();
      if (frag.isNotEmpty())
        lfSec.items.push_back(frag);
    }
    if (!lfSec.items.empty())
      sections.push_back(lfSec);
  }

  // Flow Prompts section
  auto fpVar = obj->getProperty("flowPrompts");
  if (fpVar.isArray())
  {
    Section fpSec;
    fpSec.title = "Flow Prompts";
    for (auto& fp : *fpVar.getArray())
    {
      juce::String prompt = fp.toString();
      if (prompt.isNotEmpty())
        fpSec.items.push_back(prompt);
    }
    if (!fpSec.items.empty())
      sections.push_back(fpSec);
  }

  // Challenge section
  auto chalVar = obj->getProperty("challenge");
  if (!chalVar.isVoid())
  {
    juce::String challenge = chalVar.toString();
    if (challenge.isNotEmpty())
    {
      Section chalSec;
      chalSec.title = "Challenge";
      chalSec.items.push_back(challenge);
      sections.push_back(chalSec);
    }
  }

  rebuildLayout();
  repaint();
}

void PackDetailComponent::rebuildLayout()
{
  totalContentHeight = 0;
  int padding = 12;
  int itemH = 24;
  int sectionTitleH = 32;

  for (auto& sec : sections)
  {
    sec.yPos = totalContentHeight;
    
    // Section title
    int h = sectionTitleH;
    
    // Section items
    if (sec.isExpanded)
    {
      h += sec.items.size() * itemH;
    }
    
    sec.height = h;
    totalContentHeight += h + 8;
  }

  if (scrollBar)
  {
    scrollBar->setRangeLimits(0.0, (double)juce::jmax(totalContentHeight, getHeight()));
    scrollBar->setCurrentRange(scrollPos, (double)getHeight());
  }
}

void PackDetailComponent::paint(juce::Graphics& g)
{
  // Background - dark with subtle pattern
  g.fillAll(juce::Colour(10, 16, 37));
  
  // Add a border to make the component clearly visible
  g.setColour(juce::Colour(236, 72, 153).withAlpha(0.3f));
  g.drawRect(0, 0, getWidth(), getHeight(), 2);
  
  const int padding = 12;
  int yPos = padding - static_cast<int>(scrollPos);

  // CRITICAL: Clear chip, header, and audio item lists at start of paint for mouse detection
  wordChips.clear();
  sectionHeaders.clear();
  audioItems.clear();

  // If no sections, show placeholder
  if (sections.empty())
  {
    g.setColour(juce::Colour(241, 245, 255).withAlpha(0.3f));
    g.setFont(juce::Font(14.0f));
    int totalWidth = getWidth() - padding * 2;
    if (totalWidth > 0)
    {
      g.drawText("Generated pack will appear here...", padding, getHeight() / 2 - 20, totalWidth, 40, juce::Justification::centred);
    }
    return;
  }

  // Draw each section and populate wordChips, sectionHeaders, and audioItems during this pass
  for (auto& sec : sections)
  {
    drawSection(g, sec, yPos);
  }
}

void PackDetailComponent::drawSection(juce::Graphics& g, const Section& section, int& yPos)
{
  const int padding = 12;
  const int maxWidth = getWidth() - padding * 2 - 20;
  const int sectionTitleH = 32;
  const int itemH = 28;
  const int arrowSize = 16;

  // Don't cull sections - render all of them
  // The scroll handling will clip drawing to the visible area

  // Draw section title with colored accent
  juce::Colour titleColor = juce::Colour(236, 72, 153); // Pink
  if (section.title == "Lyric Fragments") titleColor = juce::Colour(34, 211, 238); // Cyan
  else if (section.title == "Challenge") titleColor = juce::Colour(168, 85, 247); // Purple
  else if (section.title == "Audio Samples") titleColor = juce::Colour(120, 204, 120); // Green
  
  // Draw section header background (slight highlight)
  juce::Rectangle<int> headerRect(padding, yPos, getWidth() - padding * 2 - 20, sectionTitleH);
  g.setColour(titleColor.withAlpha(0.08f));
  g.fillRect(headerRect);
  
  // Draw expand/collapse arrow
  g.setColour(titleColor);
  float arrowX = padding + 6;
  float arrowY = yPos + (sectionTitleH - arrowSize) / 2.0f;
  
  if (section.isExpanded)
  {
    // Draw down-pointing arrow ▼
    juce::Path arrow;
    arrow.startNewSubPath(arrowX, arrowY);
    arrow.lineTo(arrowX + arrowSize, arrowY);
    arrow.lineTo(arrowX + arrowSize / 2.0f, arrowY + arrowSize);
    arrow.closeSubPath();
    g.fillPath(arrow);
  }
  else
  {
    // Draw right-pointing arrow ▶
    juce::Path arrow;
    arrow.startNewSubPath(arrowX, arrowY);
    arrow.lineTo(arrowX, arrowY + arrowSize);
    arrow.lineTo(arrowX + arrowSize, arrowY + arrowSize / 2.0f);
    arrow.closeSubPath();
    g.fillPath(arrow);
  }
  
  // Draw section title text
  g.setColour(titleColor);
  g.setFont(juce::Font(13.0f).boldened());
  g.drawText(section.title, padding + arrowSize + 8, yPos, maxWidth - arrowSize - 8, sectionTitleH, juce::Justification::centredLeft);
  
  // Store header clickable region (apply scroll offset)
  sectionHeaders.push_back({section.title, headerRect.translated(0, -static_cast<int>(scrollPos))});
  
  yPos += sectionTitleH;

  if (section.isExpanded)
  {
    // Handle audio items with play buttons
    if (!section.audioItems.empty())
    {
      for (const auto& audioItem : section.audioItems)
      {
        const int playButtonW = 32;
        const int playButtonH = 24;
        const int gap = 8;
        
        // Draw audio item label
        g.setColour(juce::Colour(241, 245, 255).withAlpha(0.85f));
        g.setFont(juce::Font(11.0f));
        g.drawText(audioItem.title, padding, yPos + 2, maxWidth - playButtonW - gap, playButtonH, juce::Justification::centredLeft, true);
        
        // Draw play button
        juce::Rectangle<int> playBtnRect(padding + maxWidth - playButtonW, yPos, playButtonW, playButtonH);
        g.setColour(juce::Colour(120, 204, 120).withAlpha(0.7f));
        g.fillRoundedRectangle(playBtnRect.toFloat(), 4.0f);
        
        g.setColour(juce::Colour(10, 16, 37));
        g.setFont(juce::Font(12.0f).boldened());
        g.drawText("▶", playBtnRect, juce::Justification::centred);
        
        // Store clickable region for this audio item
        audioItems.push_back({audioItem.title, audioItem.url, playBtnRect.translated(0, -static_cast<int>(scrollPos))});
        
        yPos += itemH;
      }
    }
    // For Power Words and Lyric Fragments, draw as large clickable chips
    else if (section.title == "Power Words" || section.title == "Lyric Fragments")
    {
      drawWordChipsSection(g, section.items, yPos, padding, maxWidth);
    }
    else
    {
      // For other sections, draw as regular list items
      g.setColour(juce::Colour(241, 245, 255).withAlpha(0.85f));
      g.setFont(juce::Font(12.0f));

      for (const auto& item : section.items)
      {
        g.drawText("• " + item, padding, yPos, maxWidth, itemH, juce::Justification::topLeft, true);
        yPos += itemH;
      }
    }
  }

  yPos += 8;
}

void PackDetailComponent::drawWordChipsSection(juce::Graphics& g, const std::vector<juce::String>& words, int& yPos, int padding, int maxWidth)
{
  const int chipH = 32;
  const int chipPadding = 8;
  const int gap = 8;

  int x = padding;
  int y = yPos;

  for (const auto& word : words)
  {
    if (word.isEmpty()) continue;
    
    // Approximate text width
    int textW = word.length() * 7 + chipPadding * 2 + 6;

    // Wrap to next line if needed
    if (x + textW + gap > padding + maxWidth)
    {
      x = padding;
      y += chipH + gap;
    }

    // Account for scroll offset - store absolute bounds for hit testing
    juce::Rectangle<int> chipBounds(x, y, textW, chipH);
    
    // Draw chip background with gradient effect
    g.setColour(juce::Colour(34, 211, 238).withAlpha(0.25f));
    g.fillRoundedRectangle(chipBounds.toFloat(), 6.0f);

    // Draw chip border - THICK and VISIBLE
    g.setColour(juce::Colour(34, 211, 238).withAlpha(0.9f));
    g.drawRoundedRectangle(chipBounds.toFloat(), 6.0f, 2.0f); // 2.0f stroke width for visibility

    // Draw chip text
    g.setColour(juce::Colour(255, 255, 255).withAlpha(1.0f));
    g.setFont(juce::Font(juce::FontOptions(12.0f).withHeight(13.0f)).boldened());
    g.drawText(word, chipBounds, juce::Justification::centred);

    // Store clickable region - ALWAYS populate during paint for reliable mouse detection
    wordChips.push_back({word, chipBounds});

    x += textW + gap;
  }

  yPos = y + chipH + 8;
}

void PackDetailComponent::resized()
{
  // Set up auto-scroll if needed
  if (scrollBar)
  {
    scrollBar->setBounds(getWidth() - 16, 0, 16, getHeight());
  }
  rebuildLayout();
}

void PackDetailComponent::mouseDown(const juce::MouseEvent& e)
{
  // Check if click is on a section header for expand/collapse
  for (size_t i = 0; i < sectionHeaders.size(); ++i)
  {
    const auto& header = sectionHeaders[i];
    int adjustedMouseY = e.getPosition().y + static_cast<int>(scrollPos);
    juce::Rectangle<int> adjustedBounds = header.bounds.translated(0, static_cast<int>(scrollPos));
    
    if (adjustedBounds.contains(e.getPosition()))
    {
      // Toggle expanded state for matching section
      for (auto& sec : sections)
      {
        if (sec.title == header.title)
        {
          sec.isExpanded = !sec.isExpanded;
          rebuildLayout();
          repaint();
          return;
        }
      }
    }
  }
  
  // Check if click is on a play button for audio items
  for (const auto& audioItem : audioItems)
  {
    int adjustedMouseY = e.getPosition().y + static_cast<int>(scrollPos);
    juce::Rectangle<int> adjustedBounds = audioItem.bounds.translated(0, static_cast<int>(scrollPos));
    
    if (adjustedBounds.contains(e.getPosition()))
    {
      listeners.call([&audioItem](Listener& l) { l.audioPreviewClicked(audioItem.url); });
      return;
    }
  }
  
  // Check against chips populated by the last paint() call
  // Do NOT clear them here - they were populated during paint()

  for (const auto& chip : wordChips)
  {
    // Apply scroll offset to mouse Y coordinate for accurate hit testing
    int adjustedMouseY = e.getPosition().y + static_cast<int>(scrollPos);
    juce::Rectangle<int> adjustedBounds = chip.bounds.translated(0, -static_cast<int>(scrollPos));
    
    if (adjustedBounds.contains(e.getPosition()))
    {
      listeners.call([&chip](Listener& l) { l.wordChipClicked(chip.word); });
      return;
    }
  }
}

void PackDetailComponent::scrollBarMoved(juce::ScrollBar* scrollBarThatHasMoved, double newRangeStart)
{
  scrollPos = newRangeStart;
  repaint();
}

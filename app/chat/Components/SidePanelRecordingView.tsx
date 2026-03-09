'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Box, Typography, Button, Tab, Tabs, TextField, InputAdornment } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArticleIcon from '@mui/icons-material/Article';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import MuxPlayer from '@mux/mux-player-react';
import MuxPlayerElement from '@mux/mux-player';
import { useChatStore } from '@/app/stores/useChatStore';
import { Citation } from '@/types/chat';
import { getMuxPlaybackId } from '@/app/utils/converters';
import { colors } from '@/lib/theme';
import { highlightSearchText } from '@/app/indexes/highlightSearch';

// Chapter synopses use a teal/green accent; transcript clips use primary blue
const CHAPTER_COLOR = colors.success.main;
const CLIP_COLOR = colors.primary.main;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const ExpandableText = ({ text, highlight = '' }: { text: string; highlight?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef<HTMLElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setIsClamped(el.scrollHeight > el.clientHeight + 1);
    }
  }, [text, expanded]);

  return (
    <>
      <Typography
        ref={textRef}
        variant="body2"
        color="text.primary"
        sx={{
          mt: 0.5,
          lineHeight: 1.5,
          ...(!expanded && {
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }),
        }}>
        {highlightSearchText(text, highlight)}
      </Typography>
      {(isClamped || expanded) && (
        <Typography
          component="span"
          variant="caption"
          color="primary"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          sx={{ cursor: 'pointer', fontWeight: 600, mt: 0.25, display: 'inline-block' }}>
          {expanded ? 'Show less' : 'Show more'}
        </Typography>
      )}
    </>
  );
};

type RecordingGroup = {
  theirstoryId: string;
  interviewTitle: string;
  videoUrl: string;
  isAudioFile: boolean;
  chapters: (Citation & { clips: Citation[] })[];
  ungroupedClips: Citation[];
};

function groupByRecording(citations: Citation[]): RecordingGroup[] {
  const recordingMap = new Map<string, { chapters: Citation[]; clips: Citation[] }>();
  const recordingOrder: string[] = [];
  const recordingMeta = new Map<string, { interviewTitle: string; videoUrl: string; isAudioFile: boolean }>();

  for (const c of citations) {
    const id = c.theirstoryId;
    if (!recordingMap.has(id)) {
      recordingMap.set(id, { chapters: [], clips: [] });
      recordingOrder.push(id);
      recordingMeta.set(id, { interviewTitle: c.interviewTitle, videoUrl: c.videoUrl, isAudioFile: c.isAudioFile ?? false });
    }
    if (c.isChapterSynopsis) {
      recordingMap.get(id)!.chapters.push(c);
    } else {
      recordingMap.get(id)!.clips.push(c);
    }
  }

  return recordingOrder.map((id) => {
    const { chapters, clips } = recordingMap.get(id)!;
    const meta = recordingMeta.get(id)!;

    // Sort chapters by start time
    const sortedChapters = [...chapters].sort((a, b) => a.startTime - b.startTime);

    // Assign clips to their parent chapter (clip falls within chapter time range)
    const assignedClipIndexes = new Set<number>();
    const chaptersWithClips = sortedChapters.map((ch) => {
      const chClips: Citation[] = [];
      clips.forEach((clip, idx) => {
        if (!assignedClipIndexes.has(idx) && clip.startTime >= ch.startTime && clip.startTime < ch.endTime) {
          chClips.push(clip);
          assignedClipIndexes.add(idx);
        }
      });
      chClips.sort((a, b) => a.startTime - b.startTime);
      return { ...ch, clips: chClips };
    });

    // Clips that don't fall within any chapter
    const ungroupedClips = clips.filter((_, idx) => !assignedClipIndexes.has(idx));
    ungroupedClips.sort((a, b) => a.startTime - b.startTime);

    return {
      theirstoryId: id,
      interviewTitle: meta.interviewTitle,
      videoUrl: meta.videoUrl,
      isAudioFile: meta.isAudioFile,
      chapters: chaptersWithClips,
      ungroupedClips,
    };
  });
}

const CitationBadge = ({ index, isChapter }: { index: number; isChapter: boolean }) => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: isChapter ? CHAPTER_COLOR : CLIP_COLOR,
      color: colors.primary.contrastText,
      fontWeight: 700,
      fontSize: '0.7rem',
      borderRadius: '4px',
      minWidth: 20,
      height: 20,
      flexShrink: 0,
      px: 0.4,
    }}>
    {index}
  </Box>
);

const GroupedSourcesView = ({
  citations,
  siblings,
  filterTerm,
  onSelectCitation,
}: {
  citations: Citation[];
  siblings: Citation[];
  filterTerm: string;
  onSelectCitation: (c: Citation) => void;
}) => {
  const groups = useMemo(() => groupByRecording(citations), [citations]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const hoveredCitationIndex = useChatStore((s) => s.hoveredCitationIndex);
  const setHoveredCitationIndex = useChatStore((s) => s.setHoveredCitationIndex);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to hovered citation and expand its parent group
  useEffect(() => {
    if (hoveredCitationIndex === null || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-citation-index="${hoveredCitationIndex}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      // Citation may be in a collapsed group — expand it
      for (const group of groups) {
        const allIndices = [
          ...group.chapters.map((ch) => ch.index),
          ...group.chapters.flatMap((ch) => ch.clips.map((cl) => cl.index)),
          ...group.ungroupedClips.map((cl) => cl.index),
        ];
        if (allIndices.includes(hoveredCitationIndex) && collapsed.has(group.theirstoryId)) {
          setCollapsed((prev) => {
            const next = new Set(prev);
            next.delete(group.theirstoryId);
            return next;
          });
          // Scroll after re-render
          requestAnimationFrame(() => {
            const elAfter = containerRef.current?.querySelector(`[data-citation-index="${hoveredCitationIndex}"]`);
            elAfter?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });
          break;
        }
      }
    }
  }, [hoveredCitationIndex, groups, collapsed]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (citations.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
        No sources match your filter.
      </Typography>
    );
  }

  const highlightSx = (index: number) => ({
    ...(hoveredCitationIndex === index && {
      bgcolor: `${colors.primary.main}14`,
      boxShadow: `inset 3px 0 0 ${colors.primary.main}`,
    }),
  });

  return (
    <Box ref={containerRef}>
      {groups.map((group) => {
        const playbackId = getMuxPlaybackId(group.videoUrl);
        const thumbnailUrl = playbackId && !group.isAudioFile
          ? `https://image.mux.com/${playbackId}/thumbnail.jpg?width=320&height=180&fit_mode=crop`
          : null;
        const hasContent = group.chapters.length > 0 || group.ungroupedClips.length > 0;
        if (!hasContent) return null;
        const isCollapsed = collapsed.has(group.theirstoryId);
        const itemCount = group.chapters.length + group.ungroupedClips.length;

        return (
          <Box key={group.theirstoryId} sx={{ borderBottom: '2px solid', borderColor: 'divider' }}>
            {/* Recording header — sticky + collapsible */}
            <Box
              onClick={() => toggleCollapse(group.theirstoryId)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.5,
                bgcolor: colors.grey[50],
                position: 'sticky',
                top: 0,
                zIndex: 2,
                cursor: 'pointer',
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: colors.grey[100] },
              }}>
              <ExpandMoreIcon
                sx={{
                  fontSize: 20,
                  transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  flexShrink: 0,
                }}
              />
              {thumbnailUrl ? (
                <Box
                  component="img"
                  src={thumbnailUrl}
                  alt={group.interviewTitle}
                  sx={{ width: 64, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 1, bgcolor: colors.grey[200], flexShrink: 0 }}
                />
              ) : (
                <Box sx={{ width: 64, aspectRatio: '16/9', bgcolor: colors.grey[200], borderRadius: 1, flexShrink: 0 }} />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                  {highlightSearchText(group.interviewTitle, filterTerm)}
                </Typography>
                {isCollapsed && (
                  <Typography variant="caption" color="text.secondary">
                    {itemCount} source{itemCount !== 1 ? 's' : ''}
                  </Typography>
                )}
              </Box>
            </Box>

            {!isCollapsed && (
              <>
                {/* Chapters with nested clips */}
                {group.chapters.map((chapter) => (
                  <Box key={`ch-${chapter.startTime}`}>
                    {/* Chapter row */}
                    <Box
                      data-citation-index={chapter.index}
                      onClick={() => onSelectCitation(chapter)}
                      onMouseEnter={() => setHoveredCitationIndex(chapter.index, true)}
                      onMouseLeave={() => setHoveredCitationIndex(null)}
                      sx={{
                        pl: 2,
                        pr: 2,
                        py: 1.25,
                        cursor: 'pointer',
                        borderLeft: `3px solid ${CHAPTER_COLOR}`,
                        '&:hover': { bgcolor: colors.grey[50] },
                        transition: 'all 0.15s',
                        ...highlightSx(chapter.index),
                      }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                        <CitationBadge index={chapter.index} isChapter />
                        <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }}>
                          {highlightSearchText(chapter.sectionTitle, filterTerm)}
                        </Typography>
                      </Box>
                      <ExpandableText text={chapter.transcription} highlight={filterTerm} />
                    </Box>

                    {/* Clips within this chapter */}
                    {chapter.clips.map((clip) => (
                      <Box
                        key={`clip-${clip.startTime}-${clip.index}`}
                        data-citation-index={clip.index}
                        onClick={() => onSelectCitation(clip)}
                        onMouseEnter={() => setHoveredCitationIndex(clip.index, true)}
                        onMouseLeave={() => setHoveredCitationIndex(null)}
                        sx={{
                          pl: 4,
                          pr: 2,
                          py: 1,
                          cursor: 'pointer',
                          borderLeft: `3px solid ${CLIP_COLOR}`,
                          ml: 2,
                          '&:hover': { bgcolor: colors.grey[50] },
                          transition: 'all 0.15s',
                          ...highlightSx(clip.index),
                        }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                          <CitationBadge index={clip.index} isChapter={false} />
                          <Typography variant="caption" color="text.secondary">
                            {highlightSearchText(clip.speaker, filterTerm)} &middot; {formatTime(clip.startTime)}
                          </Typography>
                        </Box>
                        <ExpandableText text={clip.transcription} highlight={filterTerm} />
                      </Box>
                    ))}
                  </Box>
                ))}

                {/* Ungrouped clips (not within any chapter) */}
                {group.ungroupedClips.map((clip) => (
                  <Box
                    key={`uclip-${clip.startTime}-${clip.index}`}
                    data-citation-index={clip.index}
                    onClick={() => onSelectCitation(clip)}
                    onMouseEnter={() => setHoveredCitationIndex(clip.index, true)}
                    onMouseLeave={() => setHoveredCitationIndex(null)}
                    sx={{
                      pl: 2,
                      pr: 2,
                      py: 1.25,
                      cursor: 'pointer',
                      borderLeft: `3px solid ${CLIP_COLOR}`,
                      '&:hover': { bgcolor: colors.grey[50] },
                      transition: 'all 0.15s',
                      ...highlightSx(clip.index),
                    }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                      <CitationBadge index={clip.index} isChapter={false} />
                      <Typography variant="caption" color="text.secondary">
                        {highlightSearchText(clip.speaker, filterTerm)} &middot; {formatTime(clip.startTime)}
                      </Typography>
                    </Box>
                    <ExpandableText text={clip.transcription} highlight={filterTerm} />
                  </Box>
                ))}
              </>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export const SidePanelRecordingView = () => {
  const activeCitation = useChatStore((s) => s.activeCitation);
  const previousMode = useChatStore((s) => s.previousMode);
  const activeCitationSiblings = useChatStore((s) => s.activeCitationSiblings);
  const citationOpenedViaChip = useChatStore((s) => s.citationOpenedViaChip);
  const goBack = useChatStore((s) => s.goBack);
  const openTranscript = useChatStore((s) => s.openTranscript);
  const setActiveCitation = useChatStore((s) => s.setActiveCitation);
  const videoRef = useRef<MuxPlayerElement>(null);
  const hasSiblings = activeCitationSiblings.length > 1;
  // Tab 0 = All Sources, Tab 1 = Source
  // If opened via chip click, go straight to Source; if auto-opened after streaming, show All Sources
  const [tabIndex, setTabIndex] = useState(citationOpenedViaChip ? 1 : (hasSiblings ? 0 : 1));
  const [filterTerm, setFilterTerm] = useState('');

  useEffect(() => {
    if (videoRef.current && activeCitation) {
      videoRef.current.currentTime = activeCitation.startTime;
    }
    // When citation changes after mount (user clicked a chip), go to Source tab
    if (citationOpenedViaChip) {
      setTabIndex(1);
    }
  }, [activeCitation, citationOpenedViaChip]);

  // Reset filter when switching tabs
  useEffect(() => {
    setFilterTerm('');
  }, [tabIndex]);

  const filteredCitations = useMemo(() => {
    const q = filterTerm.trim().toLowerCase();
    if (!q) return activeCitationSiblings;
    return activeCitationSiblings.filter((c) =>
      c.interviewTitle.toLowerCase().includes(q) ||
      c.sectionTitle.toLowerCase().includes(q) ||
      c.transcription.toLowerCase().includes(q) ||
      c.speaker.toLowerCase().includes(q),
    );
  }, [activeCitationSiblings, filterTerm]);

  if (!activeCitation) return null;

  const accentColor = activeCitation.isChapterSynopsis ? CHAPTER_COLOR : CLIP_COLOR;

  const handleSelectCitation = (citation: Citation) => {
    setActiveCitation(citation, activeCitationSiblings);
    setTabIndex(1);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {previousMode === 'search' && (
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={goBack}
          sx={{ textTransform: 'none', justifyContent: 'flex-start', px: 2, py: 1 }}>
          Back to results
        </Button>
      )}

      {hasSiblings && (
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab
            label={`All Sources (${activeCitationSiblings.length})`}
            sx={{ textTransform: 'none', minHeight: 40, py: 0 }}
          />
          <Tab label="Source" sx={{ textTransform: 'none', minHeight: 40, py: 0 }} />
        </Tabs>
      )}

      {/* All Sources tab */}
      {tabIndex === 0 && hasSiblings && (
        <Box>
          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Filter sources..."
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ bgcolor: colors.background.default, borderRadius: '8px' }}
            />
          </Box>
          <GroupedSourcesView
            citations={filteredCitations}
            siblings={activeCitationSiblings}
            filterTerm={filterTerm}
            onSelectCitation={handleSelectCitation}
          />
        </Box>
      )}

      {/* Source tab */}
      {tabIndex === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
          <Box sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: colors.common.black }}>
            <MuxPlayer
              ref={videoRef}
              src={activeCitation.videoUrl}
              audio={activeCitation.isAudioFile}
              startTime={activeCitation.startTime}
              forwardSeekOffset={10}
              backwardSeekOffset={10}
              accentColor={colors.secondary.main}
              style={{ width: '100%', aspectRatio: activeCitation.isAudioFile ? 'auto' : '16/9' }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              {activeCitation.interviewTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {activeCitation.isChapterSynopsis ? (
                <>Chapter Summary &middot; {activeCitation.sectionTitle} &middot;{' '}
                  {formatTime(activeCitation.startTime)}–{formatTime(activeCitation.endTime)}</>
              ) : (
                <>{activeCitation.speaker} &middot; {activeCitation.sectionTitle} &middot;{' '}
                  {formatTime(activeCitation.startTime)}–{formatTime(activeCitation.endTime)}</>
              )}
            </Typography>
          </Box>

          <Box
            sx={{
              bgcolor: colors.grey[50],
              borderRadius: 1,
              p: 2,
              borderLeft: `3px solid ${accentColor}`,
            }}>
            <Typography
              variant="body2"
              sx={{ fontStyle: 'italic', lineHeight: 1.6, color: colors.text.primary }}>
              &ldquo;{activeCitation.transcription}&rdquo;
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            fullWidth
            startIcon={<ArticleIcon />}
            onClick={() => openTranscript(activeCitation)}
            sx={{ textTransform: 'none' }}>
            Open Full Transcript
          </Button>
        </Box>
      )}
    </Box>
  );
};

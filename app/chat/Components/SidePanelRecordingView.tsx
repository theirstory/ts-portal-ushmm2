'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Button, Tab, Tabs } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArticleIcon from '@mui/icons-material/Article';
import MuxPlayer from '@mux/mux-player-react';
import MuxPlayerElement from '@mux/mux-player';
import { useChatStore } from '@/app/stores/useChatStore';
import { Citation } from '@/types/chat';
import { getMuxPlaybackId } from '@/app/utils/converters';
import { colors } from '@/lib/theme';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const AllSourcesCard = ({
  citation,
  siblings,
  onSelect,
}: {
  citation: Citation;
  siblings: Citation[];
  onSelect: () => void;
}) => {
  const setActiveCitation = useChatStore((s) => s.setActiveCitation);
  const playbackId = getMuxPlaybackId(citation.videoUrl);
  const thumbnailUrl = playbackId && !citation.isAudioFile
    ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${Math.floor(citation.startTime)}&width=320&height=180&fit_mode=crop`
    : null;

  const handleClick = () => {
    setActiveCitation(citation, siblings);
    onSelect();
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        p: 2,
        cursor: 'pointer',
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:hover': { bgcolor: colors.grey[50] },
        transition: 'background-color 0.15s',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
      }}>
      <Box sx={{ width: 100, flexShrink: 0 }}>
        {thumbnailUrl ? (
          <Box
            component="img"
            src={thumbnailUrl}
            alt={citation.interviewTitle}
            sx={{
              width: '100%',
              aspectRatio: '16/9',
              objectFit: 'cover',
              borderRadius: 1,
              bgcolor: colors.grey[200],
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              aspectRatio: '16/9',
              bgcolor: colors.grey[200],
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Typography variant="caption" color="text.secondary">
              {citation.isAudioFile ? 'Audio' : ''}
            </Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: colors.primary.main,
              color: colors.primary.contrastText,
              fontWeight: 700,
              fontSize: '0.7rem',
              borderRadius: '4px',
              minWidth: 20,
              height: 20,
              flexShrink: 0,
            }}>
            {citation.index}
          </Box>
          <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
            {citation.interviewTitle}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {citation.speaker} &middot; {formatTime(citation.startTime)}
        </Typography>
        <Typography
          variant="body2"
          color="text.primary"
          sx={{
            mt: 0.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.5,
          }}>
          {citation.transcription}
        </Typography>
      </Box>
    </Box>
  );
};

export const SidePanelRecordingView = () => {
  const activeCitation = useChatStore((s) => s.activeCitation);
  const previousMode = useChatStore((s) => s.previousMode);
  const activeCitationSiblings = useChatStore((s) => s.activeCitationSiblings);
  const goBack = useChatStore((s) => s.goBack);
  const openTranscript = useChatStore((s) => s.openTranscript);
  const videoRef = useRef<MuxPlayerElement>(null);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    if (videoRef.current && activeCitation) {
      videoRef.current.currentTime = activeCitation.startTime;
    }
    setTabIndex(0);
  }, [activeCitation]);

  if (!activeCitation) return null;

  const hasSiblings = activeCitationSiblings.length > 1;

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
          <Tab label="Source" sx={{ textTransform: 'none', minHeight: 40, py: 0 }} />
          <Tab
            label={`All Sources (${activeCitationSiblings.length})`}
            sx={{ textTransform: 'none', minHeight: 40, py: 0 }}
          />
        </Tabs>
      )}

      {tabIndex === 0 && (
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
              {activeCitation.speaker} &middot; {activeCitation.sectionTitle} &middot;{' '}
              {formatTime(activeCitation.startTime)}–{formatTime(activeCitation.endTime)}
            </Typography>
          </Box>

          <Box
            sx={{
              bgcolor: colors.grey[50],
              borderRadius: 1,
              p: 2,
              borderLeft: `3px solid ${colors.primary.main}`,
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

      {tabIndex === 1 && hasSiblings && (
        <Box>
          {activeCitationSiblings.map((citation, idx) => (
            <AllSourcesCard
              key={`${citation.theirstoryId}-${citation.startTime}-${idx}`}
              citation={citation}
              siblings={activeCitationSiblings}
              onSelect={() => setTabIndex(0)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

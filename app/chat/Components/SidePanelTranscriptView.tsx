'use client';

import React from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useChatStore } from '@/app/stores/useChatStore';
import { colors } from '@/lib/theme';

export const SidePanelTranscriptView = () => {
  const transcriptCitation = useChatStore((s) => s.transcriptCitation);
  const previousMode = useChatStore((s) => s.previousMode);
  const goBack = useChatStore((s) => s.goBack);

  if (!transcriptCitation) return null;

  const startTime = Math.floor(transcriptCitation.startTime);
  const endTime = Math.floor(transcriptCitation.endTime);
  const backLabel = previousMode === 'search' ? 'Back to results' : 'Back to source';
  const storyPath = `/story/${transcriptCitation.theirstoryId}?start=${startTime}&end=${endTime}`;
  const iframeSrc = `${storyPath}&embed=true`;

  const handleOpenInNewTab = () => {
    window.open(storyPath, '_blank');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: colors.background.paper,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: 1,
          py: 0.5,
        }}>
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={goBack}
          sx={{ textTransform: 'none' }}>
          {backLabel}
        </Button>
        <Tooltip title="Open in new tab">
          <IconButton size="small" onClick={handleOpenInNewTab}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <iframe
          src={iframeSrc}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          title="Full Transcript"
        />
      </Box>
    </Box>
  );
};

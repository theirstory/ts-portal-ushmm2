'use client';

import React, { memo, useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import { ChatMessageContent } from './ChatMessageContent';
import { colors } from '@/lib/theme';

type Props = {
  message: ChatMessageType;
};

export const ChatMessage = memo(({ message }: Props) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const formatTimeChicago = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopy = async () => {
    let text = message.content;

    if (message.citations?.length) {
      const citationIndices = Array.from(
        new Set(
          Array.from(text.matchAll(/\[(\d+)\]/g)).map((m) => parseInt(m[1], 10))
        )
      ).sort((a, b) => a - b);

      if (citationIndices.length > 0) {
        const footnotes = citationIndices
          .map((idx) => {
            const c = message.citations!.find((c) => c.index === idx);
            if (!c) return null;
            return `${idx}. ${c.speaker}, "${c.interviewTitle}," ${c.sectionTitle}, ${formatTimeChicago(c.startTime)}–${formatTimeChicago(c.endTime)}.`;
          })
          .filter(Boolean)
          .join('\n');

        if (footnotes) {
          text = `${text}\n\n---\nSources:\n${footnotes}`;
        }
      }
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}>
      <Box
        sx={{
          maxWidth: '85%',
          px: 2,
          py: 1.5,
          borderRadius: 2,
          bgcolor: isUser ? colors.primary.main : colors.background.paper,
          color: isUser ? colors.primary.contrastText : colors.text.primary,
          boxShadow: isUser ? 'none' : `0 1px 3px ${colors.common.shadow}`,
          '& p': { m: 0 },
          '& p + p': { mt: 1 },
          fontSize: '0.9rem',
          lineHeight: 1.6,
        }}>
        {isUser ? (
          message.content
        ) : (
          <ChatMessageContent
            content={message.content}
            citations={message.citations}
          />
        )}
      </Box>
      {!isUser && message.content && (
        <Tooltip title={copied ? 'Copied!' : 'Copy response'} arrow>
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{ mt: 0.5, color: colors.text.secondary }}>
            {copied ? (
              <CheckIcon sx={{ fontSize: 16 }} />
            ) : (
              <ContentCopyIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
});

ChatMessage.displayName = 'ChatMessage';

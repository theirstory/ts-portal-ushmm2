'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, TextField, IconButton, Typography, Button, InputAdornment } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useChatStore } from '@/app/stores/useChatStore';
import { ChatMessage } from './ChatMessage';
import { colors } from '@/lib/theme';

const STARTER_QUESTIONS = [
  'What are interesting questions this collection could uniquely answer?',
  'What are common themes across the collection?',
];

export const ChatPanel = () => {
  const [input, setInput] = useState('');
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const hoveredCitationIndex = useChatStore((s) => s.hoveredCitationIndex);
  const hoveredFromPanel = useChatStore((s) => s.hoveredFromPanel);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Scroll to hovered citation chip in chat only when hovering from the side panel
  useEffect(() => {
    if (hoveredCitationIndex === null || !hoveredFromPanel || !messagesContainerRef.current) return;
    const el = messagesContainerRef.current.querySelector(`[data-citation-index="${hoveredCitationIndex}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [hoveredCitationIndex, hoveredFromPanel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleStarterClick = (question: string) => {
    if (isStreaming) return;
    sendMessage(question);
  };

  if (isEmpty) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 2, md: 3 },
        }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: 680,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
          <Typography
            variant="h4"
            fontWeight={600}
            color={colors.text.primary}
            sx={{ textAlign: 'center', mb: 1 }}>
            Ask about the interviews
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit}>
            <TextField
              fullWidth
              multiline
              maxRows={6}
              minRows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the interviews..."
              variant="outlined"
              disabled={isStreaming}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end" sx={{ alignSelf: 'flex-end', mb: 0.5 }}>
                      <IconButton
                        type="submit"
                        disabled={!input.trim() || isStreaming}
                        sx={{
                          bgcolor: colors.primary.main,
                          color: colors.primary.contrastText,
                          '&:hover': { bgcolor: colors.primary.dark },
                          '&.Mui-disabled': { bgcolor: colors.grey[300] },
                          borderRadius: 2,
                          width: 36,
                          height: 36,
                        }}>
                        <SendIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: colors.background.paper,
                  borderRadius: 3,
                  fontSize: '1rem',
                  alignItems: 'flex-end',
                },
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
            {STARTER_QUESTIONS.map((q) => (
              <Button
                key={q}
                variant="outlined"
                fullWidth
                onClick={() => handleStarterClick(q)}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  borderColor: colors.grey[300],
                  color: colors.text.primary,
                  fontSize: '0.875rem',
                  py: 1.5,
                  px: 3,
                  justifyContent: 'flex-start',
                  bgcolor: colors.background.paper,
                  boxShadow: `0 1px 3px ${colors.common.shadow}`,
                  '&:hover': {
                    borderColor: colors.primary.main,
                    bgcolor: colors.background.paper,
                    boxShadow: `0 2px 6px ${colors.common.shadow}`,
                  },
                }}>
                {q}
              </Button>
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxWidth: 900,
        mx: 'auto',
        width: '100%',
        px: { xs: 2, md: 3 },
      }}>
      <Box
        ref={messagesContainerRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </Box>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          gap: 1,
          py: 2,
          alignItems: 'flex-end',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about the interviews..."
          variant="outlined"
          size="small"
          disabled={isStreaming}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: colors.background.paper,
              borderRadius: 2,
            },
          }}
        />
        <IconButton
          type="submit"
          disabled={!input.trim() || isStreaming}
          sx={{
            bgcolor: colors.primary.main,
            color: colors.primary.contrastText,
            '&:hover': { bgcolor: colors.primary.dark },
            '&.Mui-disabled': { bgcolor: colors.grey[300] },
            borderRadius: 2,
            width: 40,
            height: 40,
          }}>
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

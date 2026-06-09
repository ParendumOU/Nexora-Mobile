import React from 'react';
import { render } from '@testing-library/react-native';
import { MessageBubble } from '@/components/MessageBubble';
import type { ChatMessage } from '@/lib/types';

function msg(partial: Partial<ChatMessage>): ChatMessage {
  return { id: 'm1', role: 'assistant', content: '', ...partial };
}

describe('MessageBubble content pipeline', () => {
  it('renders a plain user message verbatim', () => {
    const { getByText } = render(
      <MessageBubble msg={msg({ role: 'user', content: 'hello there' })} showAgent={false} />,
    );
    expect(getByText('hello there')).toBeTruthy();
  });

  it('renders the agent name label when showAgent is set', () => {
    const { getByText } = render(
      <MessageBubble msg={msg({ content: 'hi', agentName: 'Atlas' })} showAgent />,
    );
    expect(getByText('Atlas')).toBeTruthy();
  });

  it('strips <thinking> from the body and exposes a Show reasoning toggle', () => {
    const { getByText, queryByText } = render(
      <MessageBubble
        msg={msg({ content: '<thinking>secret plan</thinking>Visible answer.' })}
        showAgent={false}
      />,
    );
    expect(getByText('Visible answer.')).toBeTruthy();
    expect(getByText('Show reasoning')).toBeTruthy();
    // collapsed by default — the reasoning text is hidden
    expect(queryByText('secret plan')).toBeNull();
  });

  it('renders a system message bubble', () => {
    const { getByText } = render(
      <MessageBubble msg={msg({ role: 'system', content: 'Reconnecting…' })} showAgent={false} />,
    );
    expect(getByText('Reconnecting…')).toBeTruthy();
  });

  it('renders a task_brief special kind with its label', () => {
    const { getByText } = render(
      <MessageBubble
        msg={msg({ content: 'Do the thing', metadata: { kind: 'task_brief' }, agentName: 'Atlas' })}
        showAgent={false}
      />,
    );
    expect(getByText(/Task brief/)).toBeTruthy();
  });

  it('renders a task_error special kind', () => {
    const { getByText } = render(
      <MessageBubble
        msg={msg({ content: 'stack trace', metadata: { kind: 'task_error' } })}
        showAgent={false}
      />,
    );
    expect(getByText(/Task error/)).toBeTruthy();
  });

  it('extracts a **tool**: ```json``` block into a collapsible tool card', () => {
    // Keep the JSON inline (no newline right after ```json) so it survives the
    // cleanContent tool_calls/json fence-stripper and is picked up by the
    // **tool**: ```json``` extractor instead.
    const content = 'Here you go:\n\n**shell_run**: ```json {"exit_code":0,"output":"done"}```';
    const { getByText } = render(<MessageBubble msg={msg({ content })} showAgent={false} />);
    // tool card header shows the tool name + exit badge
    expect(getByText('shell_run')).toBeTruthy();
    expect(getByText('exit 0')).toBeTruthy();
  });

  it('renders a metadata footer with model + cost + duration', () => {
    const { getByText } = render(
      <MessageBubble
        msg={msg({
          content: 'answer',
          metadata: {
            model: 'claude-opus',
            usage: { input_tokens: 10, output_tokens: 20 },
            cost_usd: 0.00123,
            duration_ms: 1500,
          },
        })}
        showAgent={false}
      />,
    );
    expect(getByText(/claude-opus/)).toBeTruthy();
    expect(getByText(/1\.5s/)).toBeTruthy();
  });
});

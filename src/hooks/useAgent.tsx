import { VoiceAssistant, useRemoteParticipants, useParticipantTracks, useTrackTranscription, useConnectionState, useParticipantAttributes, AgentState } from "@livekit/components-react";
import { ParticipantKind, Track, ConnectionState } from "livekit-client";
import React from "react";

const state_attribute = 'lk.agent.state';

export function useAgent(): VoiceAssistant {
  const agent = useRemoteParticipants().find((p) => p.isAgent);
  const audioTrack = useParticipantTracks([Track.Source.Microphone], agent?.identity)[1];
  const transcriptionsTrack = useParticipantTracks([Track.Source.Microphone], agent?.identity)[0];
  const { segments: agentTranscriptions } = useTrackTranscription(transcriptionsTrack);
  const connectionState = useConnectionState();
  const { attributes } = useParticipantAttributes({ participant: agent });

  const state: AgentState = React.useMemo(() => {
    if (connectionState === ConnectionState.Disconnected) {
      return 'disconnected';
    } else if (
      connectionState === ConnectionState.Connecting ||
      !agent ||
      !attributes?.[state_attribute]
    ) {
      return 'connecting';
    } else {
      return attributes[state_attribute] as AgentState;
    }
  }, [attributes, agent, connectionState]);

  return {
    agent,
    state,
    audioTrack,
    agentTranscriptions,
    agentAttributes: attributes,
  };
}

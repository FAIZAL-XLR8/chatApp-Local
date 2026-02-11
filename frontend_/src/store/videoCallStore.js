import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { getSocket } from "../services/chatService";
import useUserStore from "./useUserStore";

const useVideoCallStore = create(
    subscribeWithSelector((set, get) => ({
        /* -------------------- CALL STATE -------------------- */
        currentCall: null,
        incomingCall: null,
        isCallActive: false,
        callType: null, // "video" | "audio"

        /* -------------------- MEDIA STATE ------------------- */
        localStream: null,
        remoteStream: null,
        isVideoEnabled: true,
        isAudioEnabled: true,

        /* -------------------- WEBRTC ------------------------ */
        peerConnection: null,
        iceCandidatesQueue: [],
        isCallModalOpen: false,
        callStatus: "idle", //idle | ringing | active | ended, connecting, connected

        /* -------------------- ACTIONS ----------------------- */
        setCurrentCall: (call) => set({ currentCall: call }),
        setIncomingCall: (call) => set({ incomingCall: call }),
        setCallActive: (active) => set({ isCallActive: active }),
        setCallModalOpen: (open) => set({ isCallModalOpen: open }),
        setCallStatus: (status) => set({ callStatus: status }),
        setCallType: (type) => set({ callType: type }),
        startCall: (type) =>
            set({
                isCallActive: true,
                callType: type,
            }),

        initiateCall: (receiverId, receiverName, receiverAvatar, callType = "video") => {
            const socket = getSocket();
            const { user } = useUserStore.getState();

            if (!socket || !user) {
                console.error("Cannot initiate call: Socket or User missing", { socket: !!socket, user: !!user });
                return;
            }

            const callId = `${user?._id || user?.user?._id}-${receiverId}-${Date.now()}`;

            const callData = {
                callId,
                participantId: receiverId,
                participantName: receiverName,
                participantAvatar: receiverAvatar,
                isOutgoing: true
            };

            set({
                currentCall: callData,
                callType,
                isCallModalOpen: true,
                callStatus: "calling"
            });

            socket.emit("initiate_call", {
                callerId: user?._id || user?.user?._id,
                receiverId,
                callType,
                callerInfo: {
                    username: user?.username || user?.user?.username,
                    profilePicture: user?.profilePicture || user?.user?.profilePicture
                }
            });
        },

        endCall: () => {
            const { localStream, remoteStream, peerConnection } = get();

            if (localStream) {
                localStream.getTracks().forEach((track) => {
                    track.stop();
                    track.enabled = false;
                });
            }

            if (remoteStream) {
                remoteStream.getTracks().forEach((track) => {
                    track.stop();
                    track.enabled = false;
                });
            }

            if (peerConnection) {
                peerConnection.close();
            }

            set({
                currentCall: null,
                incomingCall: null,
                isCallActive: false,
                callType: null,
                localStream: null,
                remoteStream: null,
                peerConnection: null,
                iceCandidatesQueue: [],
                callStatus: "idle",
                isCallModalOpen: false,
                isVideoEnabled: true,
                isAudioEnabled: true
            });
        },

        setLocalStream: (stream) => set({ localStream: stream }),
        setRemoteStream: (stream) => set({ remoteStream: stream }),

        toggleVideo: () => {
            const { localStream, isVideoEnabled } = get();
            if (localStream) {
                const videoTrack = localStream.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrack.enabled = !isVideoEnabled;
                    set({ isVideoEnabled: !isVideoEnabled });
                }
            }
        },

        toggleAudio: () => {
            const { localStream, isAudioEnabled } = get();
            if (localStream) {
                const audioTrack = localStream.getAudioTracks()[0];
                if (audioTrack) {
                    audioTrack.enabled = !isAudioEnabled;
                    set({ isAudioEnabled: !isAudioEnabled });
                }
            }
        },

        setPeerConnection: (pc) => set({ peerConnection: pc }),

        addIceCandidate: (candidate) =>
            set((state) => ({
                iceCandidatesQueue: [...state.iceCandidatesQueue, candidate],
            })),

        processQueuedIceCandidates: async () => {
            const { peerConnection, iceCandidatesQueue } = get();

            if (
                peerConnection &&
                peerConnection.remoteDescription &&
                iceCandidatesQueue.length > 0
            ) {
                for (const candidate of iceCandidatesQueue) {
                    try {
                        await peerConnection.addIceCandidate(
                            new RTCIceCandidate(candidate)
                        );
                    } catch (error) {
                        console.error("ICE candidate error", error);
                    }
                }

                set({ iceCandidatesQueue: [] });
            }
        },
        clearIncomingCall: () => set({ incomingCall: null }),

        clearIceCandidates: () => set({ iceCandidatesQueue: [] }),
    }))
);

export default useVideoCallStore;
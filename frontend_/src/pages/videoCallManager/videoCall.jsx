import { useEffect, useRef, useCallback, useState } from 'react';
import useVideoCallStore from '../../store/videoCallStore';
import useUserStore from '../../store/useUserStore';
import toast from 'react-hot-toast';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from "react-icons/fa";
import { getSocket } from '../../services/chatService';

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
    ],
};

const VideoCallManage = () => {
    const socket = getSocket();
    const {
        incomingCall,
        isCallActive,
        isCallModalOpen,
        currentCall,
        callType,
        localStream,
        remoteStream,
        peerConnection,
        callStatus,
        setCallActive,
        setIncomingCall,
        setCallModalOpen,
        setCallStatus,
        setLocalStream,
        setRemoteStream,
        setPeerConnection,
        addIceCandidate,
        processQueuedIceCandidates,
        endCall,
        clearIncomingCall,
        toggleVideo,
        toggleAudio,
        isVideoEnabled,
        isAudioEnabled,
    } = useVideoCallStore();

    const { user } = useUserStore();
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);

    // Initialize checking for queued ICE candidates when connection enables
    useEffect(() => {
        if (peerConnection && peerConnection.remoteDescription) {
            processQueuedIceCandidates();
        }
    }, [peerConnection, processQueuedIceCandidates]);



    useEffect(() => {
        if (!socket) return;

        const handleIncomingCall = ({ callerId, callerName, callerAvatar, callType, callId }) => {
            setIncomingCall({
                callerId,
                callerName,
                callerAvatar,
                callId
            });
            // Only open modal if not already in a call
            if (!isCallActive) {
                setCallModalOpen(true);
                setCallStatus("ringing");
            } else {
                // Determine logic for busy state if needed
                socket.emit("reject_call", { callId, callerId });
            }
        };

        const handleCallAccepted = async ({ callId, callerName, callId: acceptedCallId }) => {
            setCallStatus("active");
            setCallActive(true);

            // Ensure media is ready
            let stream = useVideoCallStore.getState().localStream;
            if (!stream) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    setLocalStream(stream);
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = stream;
                    }
                } catch (err) {
                    console.error("Error accessing media in handleCallAccepted:", err);
                    endCall();
                    return;
                }
            }

            // Create Offer
            const pc = createPeerConnection(acceptedCallId, currentCall?.participantId || incomingCall?.callerId, stream); // Caller sends offer
            setPeerConnection(pc);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit("webrtc_offer", {
                callId: acceptedCallId,
                offer,
                receiverId: currentCall?.participantId || incomingCall?.callerId // Logic depends on who started
            });
        };

        const handleCallRejected = () => {
            setCallStatus("ended");
            toast.error("Call rejected");
            setTimeout(() => endCall(), 1000);
        };

        const handleCallEnded = () => {
            setCallStatus("ended");
            toast("Call ended");
            setTimeout(() => endCall(), 1000);
        };

        const handleWebrtcOffer = async ({ offer, senderId, callId }) => {
            // Ensure media is ready for receiver before creating answer
            let stream = useVideoCallStore.getState().localStream;
            if (!stream) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    setLocalStream(stream);
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = stream;
                    }
                } catch (err) {
                    console.error("Error accessing media in handleWebrtcOffer:", err);
                    // Don't end call immediately, maybe just audio? but here we fail
                    return;
                }
            }

            // Receiver receives offer
            const pc = createPeerConnection(callId, senderId, stream);
            setPeerConnection(pc);

            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            // Process any queued candidates now that we have remote description
            processQueuedIceCandidates();

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("webrtc_answer", {
                callId,
                answer,
                receiverId: senderId
            });
        };

        const handleWebrtcAnswer = async ({ answer }) => {
            const { peerConnection } = useVideoCallStore.getState();
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                processQueuedIceCandidates();
            }
        };

        const handleWebrtcIceCandidate = ({ candidate }) => {
            addIceCandidate(candidate);
            processQueuedIceCandidates();
        };

        const handleRemoteToggleAudio = ({ enabled }) => {
            setRemoteAudioEnabled(enabled);
            toast(enabled ? 'Remote user unmuted' : 'Remote user muted');
        };

        const handleCallFailed = ({ reason }) => {
            toast.error(`Call failed: ${reason}`);
            endCall();
        };

        const handleDisconnect = ({ callId }) => {
            setCallStatus("ended");
            toast.error("Call disconnected");
            setTimeout(() => endCall(), 1000);
        };

        socket.on("incoming_call", handleIncomingCall);
        socket.on("call_accepted", handleCallAccepted);
        socket.on("call_rejected", handleCallRejected);
        socket.on("call_ended", handleCallEnded);
        socket.on("webrtc_offer", handleWebrtcOffer);
        socket.on("webrtc_answer", handleWebrtcAnswer);
        socket.on("webrtc_ice_candidate", handleWebrtcIceCandidate);
        socket.on("remote_toggle_audio", handleRemoteToggleAudio);
        socket.on("call_failed", handleCallFailed);
        socket.on("call_disconnected", handleDisconnect);

        return () => {
            socket.off("incoming_call", handleIncomingCall);
            socket.off("call_accepted", handleCallAccepted);
            socket.off("call_rejected", handleCallRejected);
            socket.off("call_ended", handleCallEnded);
            socket.off("webrtc_offer", handleWebrtcOffer);
            socket.off("webrtc_answer", handleWebrtcAnswer);
            socket.off("webrtc_ice_candidate", handleWebrtcIceCandidate);
            socket.off("remote_toggle_audio", handleRemoteToggleAudio);
            socket.off("call_failed", handleCallFailed);
            socket.off("call_disconnected", handleDisconnect);
        };
    }, [socket, isCallActive, currentCall, incomingCall]);

    // Attach local stream to video element
    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Attach remote stream to video element
    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);


    const createPeerConnection = (callId, targetUserId, stream) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("webrtc_ice_candidate", {
                    callId,
                    candidate: event.candidate,
                    receiverId: targetUserId
                });
            }
        };

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        // Add local tracks to peer connection
        if (stream) {
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        }

        return pc;
    };

    const acceptCall = async () => {
        setCallModalOpen(false);
        setCallStatus("active"); // Will trigger media access
        setCallActive(true);

        // Wait for media to be ready - in a real app might want to ensure this better
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            socket.emit("accept_call", {
                callerId: incomingCall.callerId,
                callId: incomingCall.callId,
                receiverInfo: {
                    username: user.fullName || user.username,
                    profilePicture: user.profilePicture
                }
            });
        } catch (err) {
            console.error(err);
            endCall();
        }
    };

    const rejectCall = () => {
        if (incomingCall) {
            socket.emit("reject_call", {
                callId: incomingCall.callId,
                callerId: incomingCall.callerId
            });
        }
        setCallModalOpen(false);
        clearIncomingCall();
        setCallStatus("idle");
    };

    const handleAudioToggle = () => {
        const newEnabled = !isAudioEnabled;
        toggleAudio();

        socket.emit("toggle_audio", {
            callId: incomingCall?.callId || currentCall?.callId,
            receiverId: currentCall?.participantId || incomingCall?.callerId,
            enabled: newEnabled
        });
    };

    const endCurrentCall = () => {
        // Determine participant ID to notify
        let participantId = currentCall?.participantId;
        if (!participantId && incomingCall) {
            participantId = incomingCall.callerId; // If we answered
        }
        // Fallback if we don't know who we are talking to, or if stores are cleared differently
        // Ideally we store 'activeCallParticipantId'

        if (participantId) {
            socket.emit("end_call", {
                callId: incomingCall?.callId || currentCall?.callId, // Need consistent callId storage
                participantId
            });
        }
        endCall();
    };

    if (!isCallModalOpen && !isCallActive && callStatus === 'idle') return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
            {/* Incoming Call Modal */}
            {isCallModalOpen && incomingCall && (
                <div className="bg-gray-800 text-white p-6 rounded-lg pointer-events-auto shadow-lg flex flex-col items-center gap-4 z-50">
                    <h3 className="text-xl font-bold">Incoming {incomingCall.callType} Call</h3>
                    <img src={incomingCall.callerAvatar || "/avatar.png"} alt="Caller" className="w-24 h-24 rounded-full object-cover" />
                    <p className="text-lg">{incomingCall.callerName}</p>
                    <div className="flex gap-4 mt-4">
                        <button onClick={rejectCall} className="bg-red-600 p-3 rounded-full hover:bg-red-700 transition">
                            <FaPhoneSlash className="text-xl" />
                        </button>
                        <button onClick={acceptCall} className="bg-green-600 p-3 rounded-full hover:bg-green-700 transition">
                            <FaVideo className="text-xl" />
                        </button>
                    </div>
                </div>
            )}

            {/* Outgoing Call Modal */}
            {isCallModalOpen && callStatus === 'calling' && currentCall && (
                <div className="bg-gray-800 text-white p-6 rounded-lg pointer-events-auto shadow-lg flex flex-col items-center gap-4 z-50">
                    <h3 className="text-xl font-bold">Calling...</h3>
                    <img src={currentCall.participantAvatar || "/avatar.png"} alt="Participant" className="w-24 h-24 rounded-full object-cover" />
                    <p className="text-lg">{currentCall.participantName}</p>
                    <div className="flex gap-4 mt-4">
                        <button onClick={endCurrentCall} className="bg-red-600 p-3 rounded-full hover:bg-red-700 transition">
                            <FaPhoneSlash className="text-xl" />
                        </button>
                    </div>
                </div>
            )}

            {/* Active Call UI */}
            {isCallActive && (
                <div className="fixed inset-0 bg-black pointer-events-auto overflow-hidden">
                    {/* Main Video (Remote) */}
                    <div className="absolute inset-0 w-full h-full">
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        {/* Remote Mute Indicator */}
                        {!remoteAudioEnabled && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 p-6 rounded-full">
                                <FaMicrophoneSlash className="text-red-500 text-5xl" />
                            </div>
                        )}

                        {!remoteStream && (
                            <div className="absolute inset-0 flex items-center justify-center text-white bg-black/50">
                                <p className="text-xl font-semibold">Connecting...</p>
                            </div>
                        )}
                    </div>

                    {/* Local Video (PiP) */}
                    <div className="absolute top-4 right-4 w-32 h-48 bg-gray-900 rounded-lg overflow-hidden border-2 border-white shadow-lg z-10">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        {/* Local Mute Indicator */}
                        {!isAudioEnabled && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <FaMicrophoneSlash className="text-white text-3xl" />
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center justify-center gap-6 z-20 bg-gray-900/80 p-4 rounded-full backdrop-blur-sm">
                        <button onClick={handleAudioToggle} className={`p-4 rounded-full transition-colors ${isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
                            {isAudioEnabled ? <FaMicrophone className="text-white text-xl" /> : <FaMicrophoneSlash className="text-white text-xl" />}
                        </button>
                        <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
                            {isVideoEnabled ? <FaVideo className="text-white text-xl" /> : <FaVideoSlash className="text-white text-xl" />}
                        </button>
                        <button onClick={endCurrentCall} className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors">
                            <FaPhoneSlash className="text-white text-xl" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoCallManage;
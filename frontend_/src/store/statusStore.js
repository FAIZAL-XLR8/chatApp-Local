import { create } from "zustand";
import { getSocket } from "../services/chatService";
import axiosClient from "../services/urlServices";
const useStatusStore = create((set, get) => ({
    statuses: [],
    loading: false,
    error: null,
    setStatuses: (statuses) => set({ statuses }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    addStatus: (status) => set((state) => ({ statuses: [...state.statuses, status] })),
    removeStatus: (status) => set((state) => ({ statuses: state.statuses.filter((s) => s._id !== status._id) })),
    updateStatus: (status) => set((state) => ({ statuses: state.statuses.map((s) => s._id === status._id ? status : s) })),
    cleanupSocket: () => {
        const socket = getSocket();
        socket.off("new-status");
        socket.off("status-deleted");
        socket.off("status_viewed");
    },
    clearStatus: () => set({ statuses: [] }),
    initializeSocket: (socket) => {

        // When a new status is created
        socket.on("new-status", (newStatus) => {
            set((state) => ({
                statuses: state.statuses.some((s) => s._id === newStatus._id)
                    ? state.statuses
                    : [newStatus, ...state.statuses],
            }));
        });

        // When a status is deleted
        socket.on("status-deleted", (statusId) => {
            set((state) => ({
                statuses: state.statuses.filter((s) => s._id !== statusId),
            }));
        });

        // When a status is viewed
        socket.on("status_viewed", (statusId, viewers) => {
            set((state) => ({
                statuses: state.statuses.map((status) =>
                    status._id === statusId
                        ? { ...status, viewers }
                        : status
                ),
            }));
        });

    },
    getGroupedStatus: () => {
        const { statuses } = get();

        return statuses.reduce((acc, status) => {
            const userObj = status.user;
            if (!userObj) return acc;

            const statusUserId = (userObj._id || userObj).toString();

            if (!acc[statusUserId]) {
                acc[statusUserId] = {
                    id: statusUserId,
                    name: userObj?.userName || userObj?.username || userObj?.phoneNumber || userObj?.name || "Contact",
                    avatar: userObj?.profilePicture || "/default-avatar.png",
                    statuses: [],
                };
            }

            acc[statusUserId].statuses.push({
                id: status._id,
                media: status.mediaUrl,
                content: status.content,
                contentType: status.contentType,
                timestamp: status.createdAt,
                viewers: status.viewers,
            });

            return acc;
        }, {});
    },

    fetchStatuses: async () => {
        try {
            const response = await axiosClient.get("/status");
            set({ statuses: response.data.data || [], loading: false });
        } catch (error) {
            console.error("Error fetching statuses:", error);
        }
    },
    createStatus: async (statusData) => {
        try {
            set({ loading: true, error: null });
            const formData = new FormData();
            if (statusData.file) formData.append("media", statusData.file);
            if (statusData.content) formData.append("content", statusData.content?.trim());

            const { data } = await axiosClient.post("/status", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            //add the status in local state
            if (data.data) set((state) => ({
                statuses: state.statuses.some((s) => s._id === (data.data.status?._id || data.data._id))
                    ? state.statuses
                    : [(data.data.status || data.data), ...state.statuses], loading: false
            }));
            return data?.data?.status || data?.data;
        } catch (error) {
            console.error("Error creating status:", error);
            set({ error: error.response?.data?.message || "Failed to create status", loading: false });
        }
    },
    viewStatus: async (statusId) => {
        try {
            await axiosClient.put(`/status/${statusId}/view`);

            set((state) => ({
                statuses: state.statuses.map((status) =>
                    status._id === statusId
                        ? { ...status }
                        : status
                ),
            }));
        } catch (error) {
            set({ error: error.message });
        }
    },

    deleteStatus: async (statusId) => {
        try {
            await axiosClient.delete(`/status/${statusId}`);

            set((state) => ({
                statuses: state.statuses.filter(
                    (s) => s._id !== statusId
                ),
            }));
        } catch (error) {
            console.error("Error deleting status", error);
            set({ error: error.message, loading: false });
            throw error;
        }
    },
    getStatusViewers: async (statusId) => {
        try {
            set({ loading: true, error: false });
            const { data } = await axiosClient.get(`/status/${statusId}/viewers`);
            return data?.data;
        } catch (error) {
            console.error("Error getting status viewers", error);
            set({ error: error.message, loading: false });
            throw error;
        }
    },
    getUserStatuses: (userId) => {
        const groupedStatus = get().getGroupedStatus();
        return userId ? groupedStatus[userId] : null;
    },

    getOtherStatuses: (userId) => {
        const groupedStatus = get().getGroupedStatus();
        return Object.values(groupedStatus).filter(
            (contact) => contact.id.toString() !== userId?.toString()
        );
    },

    //clear error
    clearError: () => set({ error: null }),

    reset: () => set({
        statuses: [],
        loading: false,
        error: null,
    })

}))

export default useStatusStore;
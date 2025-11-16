import axios from "axios";

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(
  /\/$/,
  ""
);
const api = axios.create({
  baseURL: API_HOST,
  timeout: 60000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Global error toasts (no behavior change, only visual alert)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (typeof window !== "undefined") {
      try {
        const { toast } = await import("react-toastify");
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Something went wrong";
        toast.error(msg);
      } catch {
        // ignore if toast can't load
      }
    }
    return Promise.reject(error);
  }
);

// Add this helper to wrap any async API call with Toastify feedback
export async function withToast(promiseFactory, msgs) {
  if (typeof window === "undefined") return promiseFactory();
  const { toast } = await import("react-toastify");
  return toast.promise(
    Promise.resolve().then(() => promiseFactory()),
    {
      pending: msgs?.pending || "Please wait...",
      success: msgs?.success || "Done.",
      error: msgs?.error || "Request failed",
    }
  );
}

export default api;
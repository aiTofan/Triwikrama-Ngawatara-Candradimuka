const getBaseUrl = () => {
  const url = import.meta.env.VITE_SCORE_ENDPOINT || "";
  return url.replace('/skor', ''); // heuristic guess
};

export const apiService = {
  get: async (url) => {
    const res = await fetch(`${getBaseUrl()}${url}`);
    if (!res.ok) throw new Error("API Error");
    return { data: await res.json() };
  },
  post: async (url, data) => {
    const res = await fetch(`${getBaseUrl()}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = new Error("API Error");
      err.response = { data: await res.json().catch(()=>({})) };
      throw err;
    }
    return { data: await res.json() };
  },
  patch: async (url, data) => {
    const res = await fetch(`${getBaseUrl()}${url}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = new Error("API Error");
      err.response = { data: await res.json().catch(()=>({})) };
      throw err;
    }
    return { data: await res.json() };
  }
};

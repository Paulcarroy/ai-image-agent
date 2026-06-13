"use client"

import { useState, useEffect } from "react";
import { auth, db } from "@/firebase";
import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [count, setCount] = useState(0);

  // 🔥 PHASE 2 ADDITIONS
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "images"),
        where("userId", "==", user.uid)
      );

      const snapshot = await getDocs(q);

      const images = [];

      snapshot.forEach((doc) => {
        images.push(doc.data());
      });

      images.sort(
        (a, b) =>
          new Date(b.timestamp) - new Date(a.timestamp)
      );

      setHistory(images);
      setCount(images.length);
    } catch (err) {
      console.error("Load history error:", err);
    }
  };

  // ================================
  // 🚀 PHASE 2: JOB BASED GENERATION
  // ================================
  const generateImage = async () => {
    if (!prompt || loading) return;

    setLoading(true);
    setImage("");
    setStatus("creating job...");

    try {
      // 1. CREATE JOB
      const res = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, style }),
      });

      const data = await res.json();
      console.log("Job created:", data);

      if (!data.success || !data.job_id) {
        console.error("❌ Job creation failed:", data);
        setLoading(false);
        return;
      }

      setJobId(data.job_id);
      setStatus("processing...");

      // 2. POLLING FUNCTION
      const pollJob = async (id) => {
        try {
          const res = await fetch(
            `https://ai-image-agent-production.up.railway.app{id}`
          );

          const data = await res.json();
          console.log("Job status:", data);

          if (!data.success) {
            console.error("❌ Status error:", data.error);
            setLoading(false);
            return;
          }

          const job = data.job;

          // STILL PROCESSING
          if (job.status === "processing") {
            setStatus("generating image...");
            setTimeout(() => pollJob(id), 2000);
            return;
          }

          // DONE
          if (job.status === "done") {
            setImage(job.image_url);
            setStatus("completed");

            const user = auth.currentUser;

            if (user) {
              await addDoc(collection(db, "images"), {
                prompt,
                style,
                image: job.image_url,
                userId: user.uid,
                timestamp: new Date().toISOString(),
                time: new Date().toLocaleTimeString(),
              });
            }

            await loadHistory();
            setLoading(false);
            return;
          }

          // ERROR
          if (job.status === "error") {
            console.error(job.error);
            setStatus("error");
            setLoading(false);
            return;
          }

        } catch (err) {
          console.error("Polling error:", err);
          setLoading(false);
        }
      };

      pollJob(data.job_id);

    } catch (err) {
      console.error("Frontend error:", err);
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setCount(0);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        background: "#0f0f0f",
        color: "white",
        fontFamily: "Arial",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 800,
          background: "#1a1a1a",
          padding: 30,
          borderRadius: 16,
          boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
          textAlign: "center",
        }}
      >
        <h1>AI Image Generator</h1>

        <p style={{ opacity: 0.8, marginTop: 10 }}>
          Images Generated: {count}
        </p>

        {/* STATUS DISPLAY */}
        {status && (
          <p style={{ marginTop: 10, opacity: 0.7 }}>
            {status}
          </p>
        )}

        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your image..."
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #333",
            background: "#111",
            color: "white",
            marginTop: 15,
          }}
        />

        <div style={{ marginTop: 15, textAlign: "left" }}>
          <p style={{ marginBottom: 8 }}>Style</p>

          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              background: "#111",
              color: "white",
              border: "1px solid #333",
            }}
          >
            <option value="cinematic">Cinematic</option>
            <option value="anime">Anime</option>
            <option value="3d render">3D Render</option>
            <option value="realistic">Realistic</option>
            <option value="concept art">Concept Art</option>
          </select>
        </div>

        <button
          onClick={generateImage}
          disabled={loading}
          style={{
            marginTop: 15,
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "none",
            background: loading ? "#333" : "#4f46e5",
            color: "white",
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Generating..." : "Generate Image"}
        </button>

        {image && (
          <div style={{ marginTop: 20 }}>
            <img
              src={image}
              alt="Generated"
              style={{
                width: "100%",
                borderRadius: 12,
              }}
            />
          </div>
        )}

        {history.length > 0 && (
          <div style={{ marginTop: 30, textAlign: "left" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3>History</h3>

              <button
                onClick={clearHistory}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Clear History
              </button>
            </div>

            {history.map((item, index) => (
              <div
                key={index}
                style={{
                  marginTop: 15,
                  background: "#111",
                  padding: 15,
                  borderRadius: 12,
                  border: "1px solid #333",
                }}
              >
                <p style={{ fontSize: 12, opacity: 0.7 }}>
                  {item.time} • {item.style}
                </p>

                <p style={{ marginBottom: 10 }}>
                  {item.prompt}
                </p>

                <img
                  src={item.image}
                  alt="History"
                  style={{
                    width: "100%",
                    borderRadius: 8,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
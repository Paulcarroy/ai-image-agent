"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/firebase";
import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

const API_URL =
  "https://ai-image-agent-production.up.railway.app";

export default function Home() {
  const [started, setStarted] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("");
  const [dots, setDots] = useState("");

  // 🔥 loading animation
  useEffect(() => {
    if (!loading) return;

    const i = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);

    return () => clearInterval(i);
  }, [loading]);

  useEffect(() => {
    loadHistory();
  }, []);

  // ========================
  // LOAD FIREBASE HISTORY
  // ========================
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
      snapshot.forEach((doc) =>
        images.push(doc.data())
      );

      images.sort(
        (a, b) =>
          new Date(b.timestamp) -
          new Date(a.timestamp)
      );

      setHistory(images);
    } catch (err) {
      console.error(err);
    }
  };

  // ========================
  // IMAGE GENERATION
  // ========================
  const generateImage = async () => {
    if (!prompt || loading) return;

    setLoading(true);
    setImage("");
    setStatus("creating job...");

    try {
      const res = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, style }),
      });

      const data = await res.json();

      if (!data.success) {
        setStatus("error creating job");
        setLoading(false);
        return;
      }

      const poll = async (id) => {
        try {
          const res = await fetch(
            `${API_URL}/status/${id}`
          );

          const data = await res.json();

          if (!data.success) {
            setStatus("error");
            setLoading(false);
            return;
          }

          // STILL PROCESSING
          if (
            data.status === "queued" ||
            data.status === "processing"
          ) {
            setStatus("generating...");
            setTimeout(() => poll(id), 2000);
            return;
          }

          // DONE
          if (data.status === "done") {
            const img =
              data.result?.image_url;

            if (!img) {
              setStatus("missing image");
              setLoading(false);
              return;
            }

            setImage(img);
            setStatus("completed");

            const user = auth.currentUser;

            if (user) {
              await addDoc(
                collection(db, "images"),
                {
                  prompt,
                  style,
                  image: img,
                  userId: user.uid,
                  timestamp:
                    new Date().toISOString(),
                }
              );
            }

            await loadHistory();
            setLoading(false);
            return;
          }

          // ERROR
          if (data.status === "error") {
            setStatus("generation failed");
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error(err);
          setStatus("error");
          setLoading(false);
        }
      };

      poll(data.job_id);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setLoading(false);
    }
  };

  // ========================
  // SURPRISE PROMPT
  // ========================
  const surpriseMe = () => {
    const ideas = [
      "cyberpunk samurai in neon rain",
      "floating island in the sky",
      "anime astronaut on mars",
      "futuristic Lagos skyline",
      "glowing dragon in space",
      "ultra realistic city at night",
    ];

    setPrompt(
      ideas[
        Math.floor(
          Math.random() * ideas.length
        )
      ]
    );
  };

  // ========================
  // LANDING PAGE
  // ========================
  if (!started) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background:
            "radial-gradient(circle,#1a1a2e,#0f0f0f)",
          color: "white",
          textAlign: "center",
          padding: 20,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 40,
              background:
                "linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)",
              WebkitBackgroundClip:
                "text",
              WebkitTextFillColor:
                "transparent",
            }}
          >
            AI Image Generator
          </h1>

          <p style={{ opacity: 0.6 }}>
            Turn imagination into viral AI art
          </p>

          <button
            onClick={() => setStarted(true)}
            style={{
              marginTop: 20,
              padding: "12px 20px",
              borderRadius: 10,
              border: "none",
              background:
                "linear-gradient(90deg,#6366f1,#8b5cf6)",
              color: "white",
              cursor: "pointer",
            }}
          >
            Start Creating →
          </button>
        </div>
      </div>
    );
  }

  // ========================
  // MAIN TIKTOK UI
  // ========================
  return (
    <div
      style={{
        height: "100vh",
        overflowY: "scroll",
        scrollSnapType: "y mandatory",
        background: "#0f0f0f",
        color: "white",
      }}
    >
      {/* GENERATOR */}
      <div
        style={{
          height: "100vh",
          scrollSnapAlign: "start",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <h2>Generate AI Image</h2>

        <button onClick={surpriseMe}>
          🎲 Surprise Me
        </button>

        <input
          value={prompt}
          onChange={(e) =>
            setPrompt(e.target.value)
          }
          placeholder="Describe your image..."
          style={{
            padding: 12,
            marginTop: 10,
          }}
        />

        <select
          value={style}
          onChange={(e) =>
            setStyle(e.target.value)
          }
          style={{ marginTop: 10 }}
        >
          <option value="cinematic">
            Cinematic
          </option>
          <option value="anime">
            Anime
          </option>
          <option value="realistic">
            Realistic
          </option>
          <option value="3d render">
            3D Render
          </option>
        </select>

        <button
          onClick={generateImage}
          disabled={loading}
          style={{ marginTop: 10 }}
        >
          {loading
            ? "Generating" + dots
            : "Generate"}
        </button>

        {status && <p>{status}</p>}

        {image && (
          <img
            src={image}
            style={{
              width: "100%",
              marginTop: 20,
              borderRadius: 12,
            }}
          />
        )}
      </div>

      {/* FEED */}
      {history.map((item, i) => (
        <div
          key={i}
          style={{
            height: "100vh",
            scrollSnapAlign: "start",
            position: "relative",
          }}
        >
          <img
            src={item.image}
            style={{
              width: "100%",
              height: "100%",
              objectFit:
                "cover",
            }}
          />

          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
            }}
          >
            <p>{item.style}</p>
            <p>{item.prompt}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
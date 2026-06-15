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
  /* =========================
     👤 USER PROFILE STATE
  ========================= */
  const [user, setUser] = useState(null);

  const [started, setStarted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("");
  const [dots, setDots] = useState("");

  /* =========================
     🔐 AUTH LISTENER (PROFILE)
  ========================= */
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });

    return () => unsubscribe();
  }, []);

  /* =========================
     🔥 LOADING ANIMATION
  ========================= */
  useEffect(() => {
    if (!loading) return;

    const i = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);

    return () => clearInterval(i);
  }, [loading]);

  useEffect(() => {
    loadHistory();
  }, [user]);

  /* =========================
     📸 LOAD USER HISTORY
  ========================= */
  const loadHistory = async () => {
    try {
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

  /* =========================
     🚀 GENERATE IMAGE
  ========================= */
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

          if (
            data.status === "queued" ||
            data.status === "processing"
          ) {
            setStatus("generating...");
            setTimeout(() => poll(id), 2000);
            return;
          }

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

            /* =========================
               💾 SAVE WITH USER PROFILE
            ========================= */
            if (user) {
              await addDoc(
                collection(db, "images"),
                {
                  prompt,
                  style,
                  image: img,
                  userId: user.uid,
                  userEmail: user.email,
                  timestamp:
                    new Date().toISOString(),
                }
              );
            }

            await loadHistory();
            setLoading(false);
            return;
          }

          if (data.status === "error") {
            setStatus("generation failed");
            setLoading(false);
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
      setLoading(false);
    }
  };

  /* =========================
     🎲 SURPRISE PROMPT
  ========================= */
  const surpriseMe = () => {
    const ideas = [
      "cyberpunk samurai in neon rain",
      "floating island in the sky",
      "anime astronaut on mars",
      "futuristic Lagos skyline",
      "glowing dragon in space",
    ];

    setPrompt(
      ideas[Math.floor(Math.random() * ideas.length)]
    );
  };

  /* =========================
     📱 LANDING PAGE
  ========================= */
  if (!started) {
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
      }}
    >
      {/* VIDEO BACKGROUND */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
      >
        <source
          src="https://cdn.pixabay.com/video/2023/10/20/185623-876778885_large.mp4"
          type="video/mp4"
        />
      </video>

      {/* DARK OVERLAY */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.6)",
          zIndex: 1,
        }}
      />

      {/* CONTENT */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          maxWidth: 600,
          padding: 20,
        }}
      >
        <h1 style={{ fontSize: 48 }}>
          AI Image Generator
        </h1>

        <p style={{ opacity: 0.8 }}>
          Turn imagination into AI art
        </p>

        <button
          onClick={() => setStarted(true)}
          style={{
            marginTop: 20,
            padding: "14px 22px",
            borderRadius: 12,
            border: "none",
            background: "#6366f1",
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
  /* =========================
     📱 MAIN APP
  ========================= */
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
      {/* 👤 PROFILE HEADER */}
      {user && (
        <div
          style={{
            position: "fixed",
            top: 10,
            right: 10,
            background: "#111",
            padding: "8px 12px",
            borderRadius: 10,
            fontSize: 12,
            zIndex: 10,
          }}
        >
          👤 {user.email}
        </div>
      )}

      {/* GENERATOR */}
      <div
        style={{
          height: "100vh",
          scrollSnapAlign: "start",
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
        />

        <select
          value={style}
          onChange={(e) =>
            setStyle(e.target.value)
          }
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
        >
          {loading
            ? "Generating" + dots
            : "Generate"}
        </button>

        <p>{status}</p>

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

      {/* FEED (USER ONLY) */}
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
              objectFit: "cover",
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
            <p style={{ fontSize: 10, opacity: 0.6 }}>
              {item.userEmail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
"use client";
import { useEffect } from "react";
import { useState, useRef, CSSProperties, ChangeEvent } from "react";
import { Camera, Upload, Zap, ArrowRight, X, AlertCircle, ArrowLeft, ChevronsLeft, ChevronsRight } from "lucide-react";
// removed next/image usage because we're showing base64 imgs directly

interface BackendResult {
  filename: string;
  class?: string;
  confidence?: number;
  gradcam?: string | null;
  error?: string;

  // NEW FIELDS
  probabilities?: {
    thar: number;
    wrangler: number;
  };

  certainty?: "High" | "Medium" | "Low";

  imageStats?: {
    brightness: string;
    sharpness: string;
    contrast: string;
    visibility: string;
  };

  system?: {
    latency_ms: number;
    modelName: string;
  };
}


export default function VehicleClassifier() {
  // file & preview states
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<string[]>([]); // base64 preview strings
  const [results, setResults] = useState<BackendResult[] | null>(null);

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // refs
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  // touch swipe state
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02);} 100% { transform: scale(1);} }
  `;
  document.head.appendChild(styleSheet);

  return () => {
    if (styleSheet && styleSheet.parentNode) {
      styleSheet.parentNode.removeChild(styleSheet);
    }
  };
}, []);


  // file -> base64 helper
  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

  // handle gallery multiple upload
  const handleGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    const arr = Array.from(selected);
    setFiles(arr);

    const previews = await Promise.all(arr.map((f) => fileToBase64(f)));
    setImages(previews);
    setResults(null);
    setCurrentIndex(0);
  };

  // handle camera single capture (keeps same UX but sets single file)
  const handleCameraCapture = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFiles([f]);
    const preview = await fileToBase64(f);
    setImages([preview]);
    setResults(null);
    setCurrentIndex(0);
  };

  // clear all
  const clearAll = () => {
    setFiles([]);
    setImages([]);
    setResults(null);
    setCurrentIndex(0);
  };

  // predict - send all files as "files" to backend
  const handlePredict = async () => {
    if (files.length === 0) {
      alert("Please select at least one image.");
      return;
    }

    setLoading(true);
    setResults(null);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/predict`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      // expected: { results: [ {filename, class, confidence, gradcam?, error? }, ... ] }
      if (data && Array.isArray(data.results)) {
        setResults(data.results);
      } else {
        // backend returned unexpected format; try to handle older single-result format
        if (data?.filename) {
          setResults([data]);
        } else {
          throw new Error("Unexpected backend response");
        }
      }

      // try to show result for currentIndex (if out of range adjust)
      setCurrentIndex((ci) => Math.min(ci, Math.max(0, (data.results?.length || 1) - 1)));
    } catch (err) {
      console.error("Prediction error:", err);
      alert("Prediction failed. Check backend connection & logs.");
    } finally {
      setLoading(false);
    }
  };

  // navigate slides (desktop arrows + programmatic)
  const goPrev = () => {
    setCurrentIndex((i) => {
      if (images.length === 0) return 0;
      return (i - 1 + images.length) % images.length;
    });
  };
  const goNext = () => {
    setCurrentIndex((i) => {
      if (images.length === 0) return 0;
      return (i + 1) % images.length;
    });
  };

  // touch handlers for swipe detection (mobile)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const onTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const dx = touchStartX.current - touchEndX.current;
    const threshold = 40; // px
    if (dx > threshold) {
      // swiped left -> next
      goNext();
    } else if (dx < -threshold) {
      // swiped right -> prev
      goPrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (images.length === 0) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images]);

  // helper to find result for current image using filename matching
  const currentResult = (): BackendResult | null => {
    if (!results || results.length === 0) return null;
    const currentFile = files[currentIndex];
    if (!currentFile) return null;
    const found = results.find((r) => r.filename === currentFile.name);
    if (found) return found;
    // fallback: use index-matching if filenames don't match
    return results[currentIndex] ?? null;
  };

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <div style={styles.header}>
        <div style={styles.headerGradient}></div>
        <div style={styles.headerContent}>
          <div style={styles.iconBadge}>
            <Zap size={24} color="#fff" />
          </div>
          <h1 style={styles.title}>AI Vehicle Classifier</h1>
          <p style={styles.subtitle}>Mahindra Thar vs Jeep Wrangler</p>
          <div style={styles.techBadge}>
            <span style={styles.techText}>Mobile-friendly • ONNX • FastAPI</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.actionSection}>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraCapture}
          style={styles.hiddenInput}
        />
        <button onClick={() => cameraRef.current?.click()} style={styles.primaryButton}>
          <Camera size={18} />
          <span>Open Camera</span>
          <ArrowRight size={16} style={styles.buttonArrow} />
        </button>

        <input
          ref={galleryRef}
          id="gallery-upload"
          type="file"
          accept="image/*"
          multiple
          onChange={handleGalleryUpload}
          style={styles.hiddenInput}
        />
        <button onClick={() => galleryRef.current?.click()} style={styles.secondaryButton}>
          <Upload size={18} />
          <span>Upload from Gallery (Multiple)</span>
        </button>
      </div>

      {/* Main big card (image viewer + result subsection) */}
      <div style={styles.mainCardWrapper}>
        <div style={styles.mainCard}>
          {/* image viewer area */}
          <div
            ref={sliderRef}
            style={styles.viewer}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* left arrow (desktop) */}
            {images.length > 1 && (
              <button
                onClick={goPrev}
                aria-label="Previous image"
                style={{ ...styles.navArrow, left: 12 }}
                className="desktop-only"
              >
                <ArrowLeft size={20} />
              </button>
            )}

            {/* image / placeholder */}
            {images.length === 0 ? (
              <div style={styles.viewerEmpty}>
                <Upload size={48} color="#cbd5e1" />
                <p style={styles.emptyText}>No images selected</p>
                <p style={styles.emptySubtext}>Use camera or upload from gallery</p>
              </div>
            ) : (
              <div style={styles.imageContainer}>
                <img
                  src={images[currentIndex]}
                  alt={`preview-${currentIndex}`}
                  style={styles.viewerImage}
                  draggable={false}
                />
                {/* small filename badge */}
                <div style={styles.filenameBadge}>{files[currentIndex]?.name ?? `Image ${currentIndex + 1}`}</div>
              </div>
            )}

            {/* right arrow (desktop) */}
            {images.length > 1 && (
              <button
                onClick={goNext}
                aria-label="Next image"
                style={{ ...styles.navArrow, right: 12 }}
                className="desktop-only"
              >
                <ChevronsRight size={18} />
              </button>
            )}

            {/* mobile left/right simple chevrons overlay for hint */}
            {images.length > 1 && (
              <div style={styles.mobileArrowsHint}>
                <div style={styles.hintLeft}>‹</div>
                <div style={styles.hintRight}>›</div>
              </div>
            )}
          </div>

          {/* pager dots */}
          {images.length > 1 && (
            <div style={styles.pager}>
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    ...styles.pagerDot,
                    ...(idx === currentIndex ? styles.pagerDotActive : {}),
                  }}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* buttons row inside card */}
          <div style={styles.cardActions}>
            <button
              onClick={handlePredict}
              disabled={loading || files.length === 0}
              style={{
                ...styles.predictButton,
                ...(loading || files.length === 0 ? styles.predictButtonDisabled : {}),
                marginRight: 12,
              }}
            >
              {loading ? <div style={styles.spinner}></div> : <Zap size={18} />}
              <span>{loading ? "Analyzing..." : "Run Prediction"}</span>
            </button>

            <button onClick={clearAll} style={styles.ghostButton}>
              <X size={16} />
              <span>Clear</span>
            </button>
          </div>

          {/* Result subsection for currently visible image */}
          <div style={styles.resultSubsection}>
            <h3 style={styles.resultTitle}>Result</h3>

            {!results && !loading && files.length === 0 && (
              <p style={styles.resultPlaceholder}>No image selected — results will appear here.</p>
            )}

            {!results && loading && (
              <p style={styles.resultPlaceholder}>Running model — please wait...</p>
            )}

            {results && (
              <div style={styles.resultContent}>
                {(() => {
                  const r = currentResult();
                  if (!r) {
                    return <p style={styles.resultPlaceholder}>No result for this image yet — try running prediction.</p>;
                  }
                  if (r.error) {
                    return <p style={{ color: "#ef4444", fontWeight: 700 }}>{r.error}</p>;
                  }
                    return (
                      <>
                        {/* Detected Vehicle */}
                        <div style={styles.resultRow}>
                          <div style={styles.resultLabel}>Detected</div>
                          <div style={styles.resultValue}>
                            {r.class === "thar" ? "Mahindra Thar" : r.class === "wrangler" ? "Jeep Wrangler" : r.class}
                          </div>
                        </div>
                    
                        {/* Confidence */}
                        <div style={styles.resultRow}>
                          <div style={styles.resultLabel}>Confidence</div>
                          <div style={styles.resultValue}>
                            {(typeof r.confidence === "number" ? (r.confidence * 100).toFixed(2) : "—") + "%"}
                          </div>
                        </div>
                    
                        {/* Confidence Bar */}
                        <div style={styles.confidenceContainer}>
                          <div style={styles.progressBar}>
                            <div
                              style={{
                                ...styles.progressFill,
                                width: `${Math.min(100, Math.max(0, (r.confidence ?? 0) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                    
                        {/* Probability Breakdown */}
                        <div style={styles.analyticsCard}>
                          <div style={styles.analyticsTitle}>Probability Breakdown</div>
                          <div style={styles.analyticsRow}>
                            <span>Thar</span>
                            <span>{((r.probabilities?.thar ?? 0) * 100).toFixed(2)}%</span>
                          </div>
                          <div style={styles.analyticsRow}>
                            <span>Wrangler</span>
                            <span>{((r.probabilities?.wrangler ?? 0) * 100).toFixed(2)}%</span>
                          </div>
                        </div>
                    
                        {/* Model Certainty */}
                        <div style={styles.analyticsCardBlue}>
                          <div style={styles.analyticsTitleBlue}>Model Certainty</div>
                          <div style={styles.analyticsValueBlue}>{r.certainty}</div>
                        </div>
                    
                        {/* Image Quality */}
                        <div style={styles.analyticsCard}>
                          <div style={styles.analyticsTitle}>Image Quality Analysis</div>
                    
                          <div style={styles.analyticsRow}>
                            <span>Brightness</span>
                            <span>{r.imageStats?.brightness}</span>
                          </div>
                          <div style={styles.analyticsRow}>
                            <span>Sharpness</span>
                            <span>{r.imageStats?.sharpness}</span>
                          </div>
                          <div style={styles.analyticsRow}>
                            <span>Contrast</span>
                            <span>{r.imageStats?.contrast}</span>
                          </div>
                          <div style={styles.analyticsRow}>
                            <span>Visibility</span>
                            <span>{r.imageStats?.visibility}</span>
                          </div>
                        </div>
                    
                        {/* System Metrics */}
                        <div style={styles.analyticsCardGray}>
                          <div style={styles.analyticsTitleGray}>System Metrics</div>
                    
                          <div style={styles.analyticsRow}>
                            <span>Inference Time</span>
                            <span>{r.system?.latency_ms} ms</span>
                          </div>
                          <div style={styles.analyticsRow}>
                            <span>Model</span>
                            <span>{r.system?.modelName}</span>
                          </div>
                          <div style={styles.analyticsRow}>
                            <span>Resolution</span>
                            <span>224 × 224</span>
                          </div>
                        </div>
                      </>
                    );

                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerContent}>
          <AlertCircle size={16} color="#64748b" />
          <span style={styles.footerText}>Deep Learning Model • Real-time Inference</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Styles (kept vibrant + professional, expanded for card) ---------- */
const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #e6eefc 100%)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    paddingBottom: "80px",
    paddingTop: "8px",
  },
  header: {
    position: "relative",
    background: "linear-gradient(135deg, #0ea5e9 0%, #7c3aed 100%)",
    padding: "36px 20px 46px",
    borderRadius: "0 0 28px 28px",
    boxShadow: "0 10px 40px rgba(124, 58, 237, 0.12)",
    overflow: "hidden",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "radial-gradient(circle at 25% 40%, rgba(255,255,255,0.12) 0%, transparent 40%)",
    pointerEvents: "none",
  },
  headerContent: {
    position: "relative",
    textAlign: "center",
    color: "white",
  },
  iconBadge: {
    width: "64px",
    height: "64px",
    background: "rgba(255,255,255,0.18)",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.18)",
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: "28px",
    fontWeight: 800,
    letterSpacing: "-0.6px",
  },
  subtitle: {
    margin: "0 0 10px 0",
    fontSize: "14px",
    opacity: 0.95,
    fontWeight: 500,
  },
  techBadge: {
    display: "inline-block",
    background: "rgba(255,255,255,0.12)",
    padding: "6px 14px",
    borderRadius: "999px",
    marginTop: 6,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  techText: {
    fontSize: "12px",
    fontWeight: 600,
    color: "rgba(255,255,255,0.95)",
  },

  /* Action section */
  actionSection: {
    padding: "18px 20px",
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    alignItems: "center",
  },
  hiddenInput: { display: "none" },
  primaryButton: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    background: "linear-gradient(90deg, #06b6d4 0%, #7c3aed 100%)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(124,58,237,0.15)",
  },
  buttonArrow: {
    marginLeft: "6px",
    transition: "transform 0.2s ease",
  },
  secondaryButton: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    background: "white",
    color: "#374151",
    border: "2px solid #e6eefc",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },

  /* main card wrapper */
  mainCardWrapper: {
    display: "flex",
    justifyContent: "center",
    padding: "18px 20px 28px",
  },
  mainCard: {
    width: "100%",
    maxWidth: "920px",
    background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
    borderRadius: "20px",
    padding: "18px",
    boxShadow: "0 10px 40px rgba(2,6,23,0.06)",
    border: "1px solid rgba(14,165,233,0.06)",
  },

  /* viewer area */
  viewer: {
    position: "relative",
    borderRadius: "14px",
    overflow: "hidden",
    minHeight: "360px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, #eef2ff 0%, #ffffff 100%)",
    border: "1px solid #eef2ff",
  },
  viewerEmpty: {
    textAlign: "center",
    padding: "26px",
    color: "#6b7280",
  },
  imageContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: {
    maxWidth: "100%",
    maxHeight: "520px",
    objectFit: "contain",
    borderRadius: "8px",
    boxShadow: "0 8px 30px rgba(99,102,241,0.06)",
    userSelect: "none",
  },
  filenameBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    padding: "8px 12px",
    background: "rgba(0,0,0,0.6)",
    color: "white",
    fontSize: "13px",
    fontWeight: 700,
    borderRadius: "10px",
    backdropFilter: "blur(6px)",
  },

  /* nav arrows */
  navArrow: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 30,
    width: 44,
    height: 44,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.9)",
    border: "1px solid rgba(14,165,233,0.12)",
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(9,12,38,0.06)",
  },

  mobileArrowsHint: {
    position: "absolute",
    inset: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    pointerEvents: "none",
    opacity: 0.08,
    fontSize: 80,
    color: "#0ea5e9",
    zIndex: 1,
  },
  hintLeft: {
    paddingLeft: "20px",
  },
  hintRight: {
    paddingRight: "20px",
  },

  /* pager dots */
  pager: {
    display: "flex",
    gap: 8,
    justifyContent: "center",
    marginTop: 12,
  },
  pagerDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "#e6eefc",
    border: "1px solid rgba(14,165,233,0.06)",
    cursor: "pointer",
  },
  pagerDotActive: {
    background: "linear-gradient(90deg, #06b6d4 0%, #7c3aed 100%)",
    transform: "scale(1.15)",
  },

  /* actions & result */
  cardActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    justifyContent: "flex-start",
  },
  predictButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    background: "linear-gradient(90deg, #f97316 0%, #ef4444 100%)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(239,68,68,0.18)",
  },
  predictButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  ghostButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    background: "transparent",
    border: "1px solid #eef2ff",
    color: "#374151",
    borderRadius: 10,
    cursor: "pointer",
  },

  resultSubsection: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    background: "linear-gradient(180deg, rgba(14,165,233,0.03) 0%, rgba(124,58,237,0.02) 100%)",
    border: "1px solid rgba(14,165,233,0.06)",
  },
  resultTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
  },
  resultPlaceholder: {
    marginTop: 8,
    color: "#475569",
  },
  resultContent: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  resultRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 13,
    color: "#475569",
    fontWeight: 700,
    textTransform: "uppercase",
  },
  resultValue: {
    fontSize: 16,
    fontWeight: 900,
    color: "#0ea5e9",
  },

  confidenceContainer: {
    marginTop: 4,
  },
  progressBar: {
    width: "100%",
    height: 10,
    background: "#f1f5f9",
    borderRadius: 999,
    overflow: "hidden",
    border: "1px solid rgba(14,165,233,0.04)",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
    borderRadius: 999,
    transition: "width 0.6s cubic-bezier(0.2,0.9,0.2,1)",
  },

/* Analytics Cards - IMPROVED CONTRAST */
analyticsCard: {
  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
  border: "2px solid #cbd5e1",  // Changed from 1px #e2e8f0
  borderRadius: "14px",
  padding: "16px",
  marginTop: "12px",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",  // Increased shadow
},
analyticsTitle: {
  fontSize: "13px",
  fontWeight: 800,
  color: "#1e293b",  // Changed from #334155 (darker)
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: "14px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
},
analyticsRow: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px solid #e2e8f0",  // Changed from #f1f5f9
  fontSize: "14px",
},
analyticsCardBlue: {
  background: "linear-gradient(135deg, #bfdbfe 0%, #c7d2fe 100%)",  // More saturated
  border: "2px solid #60a5fa",  // Stronger border - changed from #93c5fd
  borderRadius: "14px",
  padding: "18px",
  marginTop: "12px",
  textAlign: "center",
  boxShadow: "0 6px 16px rgba(59, 130, 246, 0.15)",  // Increased shadow
},
analyticsTitleBlue: {
  fontSize: "12px",
  fontWeight: 700,
  color: "#1e3a8a",  // Changed from #1e40af (darker)
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: "8px",
},
analyticsValueBlue: {
  fontSize: "28px",
  fontWeight: 900,
  color: "#1d4ed8",  // Changed from #2563eb (darker)
  letterSpacing: "-0.5px",
},
analyticsCardGray: {
  background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",  // More contrast
  border: "2px solid #cbd5e1",  // Changed from 1px #e2e8f0
  borderRadius: "14px",
  padding: "16px",
  marginTop: "12px",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",  // Increased shadow
},
analyticsTitleGray: {
  fontSize: "13px",
  fontWeight: 800,
  color: "#334155",  // Changed from #475569 (darker)
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: "14px",
},

  spinner: {
    width: 18,
    height: 18,
    border: "3px solid rgba(255,255,255,0.3)",
    borderTop: "3px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  /* footer */
  footer: {
    padding: "24px 20px",
    marginTop: 20,
    display: "flex",
    justifyContent: "center",
  },
  footerContent: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    background: "white",
    borderRadius: 12,
    boxShadow: "0 4px 16px rgba(2,6,23,0.04)",
  },
  footerText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 600,
  },

  /* small responsive helpers */
  emptyText: { margin: "12px 0 6px", fontSize: 16, fontWeight: 700, color: "#374151" },
  emptySubtext: { margin: 0, fontSize: 13, color: "#64748b" },
};

/* ---------- Helper (outside the component) ---------- */
/* none needed - inline functions used */

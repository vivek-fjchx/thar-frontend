"use client";
import { useEffect } from "react";

import { useState, useRef, CSSProperties, ChangeEvent } from "react";
import { Camera, Upload, Zap, ArrowRight, X, AlertCircle } from "lucide-react";
import Image from "next/image";

interface PredictionResult {
  class: string;
  confidence: number;
  gradcam?: string;
}

export default function VehicleClassifier() {
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [gradcamImage, setGradcamImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);

  return () => {
    document.head.removeChild(styleSheet);
  };
}, []);
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        setImage(typeof result === "string" ? result : null);
        setResult(null);
        setGradcamImage(null);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleCameraCapture = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        setImage(typeof result === "string" ? result : null);
        setResult(null);
        setGradcamImage(null);
        setShowCamera(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePredict = async () => {
    if (!image) {
      alert("Please select or capture an image first");
      return;
    }

    setLoading(true);
    setResult(null);

    const byteString = atob(image.split(",")[1]);
    const mimeString = image.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeString });
    const formData = new FormData();
    formData.append("image", blob, "image.jpg");

    try {
      // Example in fetch
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/predict`, {
  method: "POST",
  body: formData,
});

// NEW critical check
if (!res.ok) {
  throw new Error(`HTTP ${res.status}`);
}

const data = await res.json();
console.log("DATA FROM BACKEND:", data);

setResult(data);

      if (data.gradcam && data.gradcam.length > 10) {
  setGradcamImage(`data:image/png;base64,${data.gradcam}`);
} else {
  setGradcamImage(null);
}

    } catch (error) {
      console.error("Error:", error);
      alert("Prediction failed. Check backend connection.");
    }

    setLoading(false);
  };


  

const handleGradcam = async () => {
  if (!image) {
    alert("Please select or capture an image first");
    return;
  }
  setLoading(true);

  // Convert base64 + Blob again
  const bytestring = atob(image.split(",")[1]);
  const mimestring = image.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(bytestring.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < bytestring.length; i++) {
    ia[i] = bytestring.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimestring });
  const formData = new FormData();
  formData.append("image", blob, "image.jpg");

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/gradcam`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data.gradcam) {
      setGradcamImage(`data:image/png;base64,${data.gradcam}`);
    } else {
      alert("GradCAM not available");
    }
  } catch (err) {
    console.error(err);
    alert("Please Upgrade to $25 per month pack on render to get Gradcam image.");
  } finally {
    setLoading(false);
  }
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
          <p style={styles.subtitle}>Thar Roxx vs Jeep Wrangler Detection</p>
          <div style={styles.techBadge}>
            <span style={styles.techText}>ResNet50 • Grad-CAM • PyTorch</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.actionSection}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraCapture}
          style={styles.hiddenInput}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          style={styles.primaryButton}
        >
          <Camera size={20} />
          <span>Open Camera</span>
          <ArrowRight size={18} style={styles.buttonArrow} />
        </button>

        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={styles.hiddenInput}
          id="gallery-upload"
        />
        
        <button
          onClick={() => document.getElementById('gallery-upload')?.click()}
          style={styles.secondaryButton}
        >
          <Upload size={20} />
          <span>Upload from Gallery</span>
        </button>
      </div>

      {/* Image Preview */}
      <div style={styles.previewSection}>
        <div style={styles.previewLabel}>
          <span>Image Preview</span>
          {image && (
            <button
              onClick={() => {
                setImage(null);
                setResult(null);
                setGradcamImage(null);
              }}
              style={styles.clearButton}
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>
        
        <div style={styles.previewBox}>
          {image ? (
            <img src={image} alt="preview" style={styles.previewImage} />
          ) : (
            <div style={styles.emptyState}>
              <Upload size={48} color="#cbd5e1" />
              <p style={styles.emptyText}>No image selected</p>
              <p style={styles.emptySubtext}>Capture or upload an image to begin</p>
            </div>
          )}
        </div>
      </div>

      {/* Predict Button */}
      <button
        onClick={handlePredict}
        disabled={loading || !image}
        style={{
          ...styles.predictButton,
          ...(loading || !image ? styles.predictButtonDisabled : {}),
        }}
      >
        {loading ? (
          <>
            <div style={styles.spinner}></div>
            <span>Analyzing...</span>
          </>
        ) : (
          <>
            <Zap size={20} />
            <span>Run Prediction</span>
          </>
        )}
      </button>

      {/* Results Section */}
      {result && (
        <div style={styles.resultsSection}>
          <div style={styles.resultCard}>
            <h3 style={styles.resultTitle}>Classification Result</h3>
            
            <div style={styles.classificationBox}>
              <div style={styles.classLabel}>Detected Vehicle</div>
              <div style={styles.className}>
                 {result.class === "thar" ? "Mahindra Thar Roxx " : "Jeep Wrangler"}
              </div>
            </div>

            <div style={styles.confidenceContainer}>
              <div style={styles.confidenceLabel}>
                <span>Confidence Score</span>
                <span style={styles.confidenceValue}>
                  {(result.confidence * 100).toFixed(2)}%
                </span>
              </div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${result.confidence * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Generate GradCAM Button */}
          <button
          onClick={handleGradcam}
          disabled={loading || !image}
          style={{
          ...styles.predictButton,
          background: "linear-gradient(135deg, #fbd786 0%, #f7797d 100%)",
          ...(loading || !image ? styles.predictButtonDisabled : {}),
          marginTop: "12px",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s ease",
          boxShadow: "0 6px 20px rgba(247, 121, 125, 0.35)",
          }}
          onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)";
          }}
          onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
          >
          <span
          style={{
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "16px",
          }}
          >
          🔥 Generate Grad-CAM
          </span>
          
          {/* pulse animation behind */}
          <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.25), transparent 60%)",
            opacity: 0,
            animation: image ? "gradcamPulse 2s infinite" : "none",
            pointerEvents: "none",
          }}
          />
          </button>


          
          {/* Grad-CAM Visualization */}
          {gradcamImage && (
            <div style={styles.gradcamCard}>
              <h3 style={styles.gradcamTitle}>
                <span style={styles.gradcamIcon}>🔥</span>
                Grad-CAM Heatmap
              </h3>
              <p style={styles.gradcamDesc}>
                Visual explanation showing which regions influenced the model's decision
              </p>
              <div style={styles.gradcamBox}>
                <img
                  src={gradcamImage}
                  alt="Grad-CAM Heatmap"
                  style={styles.gradcamImage}
                />
              </div>
              <div style={styles.heatmapLegend}>
                <span style={styles.legendItem}>
                  <span style={{...styles.legendColor, background: '#0000ff'}}></span>
                  Low
                </span>
                <span style={styles.legendItem}>
                  <span style={{...styles.legendColor, background: '#00ff00'}}></span>
                  Medium
                </span>
                <span style={styles.legendItem}>
                  <span style={{...styles.legendColor, background: '#ff0000'}}></span>
                  High
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerContent}>
          <AlertCircle size={16} color="#64748b" />
          <span style={styles.footerText}>
            Deep Learning Model • Real-time Inference
          </span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(to bottom, #f8fafc, #e2e8f0)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    paddingBottom: "80px",
  },
  header: {
    position: "relative",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "40px 20px 50px",
    borderRadius: "0 0 30px 30px",
    boxShadow: "0 10px 40px rgba(102, 126, 234, 0.3)",
    overflow: "hidden",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)",
    pointerEvents: "none",
  },
  headerContent: {
    position: "relative",
    textAlign: "center",
    color: "white",
  },
  iconBadge: {
    width: "60px",
    height: "60px",
    background: "rgba(255, 255, 255, 0.2)",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    backdropFilter: "blur(10px)",
    border: "2px solid rgba(255, 255, 255, 0.3)",
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    margin: "0 0 16px 0",
    fontSize: "15px",
    opacity: 0.9,
    fontWeight: "400",
  },
  techBadge: {
    display: "inline-block",
    background: "rgba(255, 255, 255, 0.15)",
    padding: "6px 16px",
    borderRadius: "20px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
  techText: {
    fontSize: "12px",
    fontWeight: "500",
    letterSpacing: "0.5px",
  },
  actionSection: {
    padding: "24px 20px 0",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  hiddenInput: {
    display: "none",
  },
  primaryButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "16px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "16px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(102, 126, 234, 0.3)",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
  },
  buttonArrow: {
    marginLeft: "auto",
    transition: "transform 0.3s ease",
  },
  secondaryButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "16px",
    background: "white",
    color: "#667eea",
    border: "2px solid #e2e8f0",
    borderRadius: "16px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  previewSection: {
    padding: "24px 20px 0",
  },
  previewLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#475569",
  },
  clearButton: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 12px",
    background: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
  previewBox: {
    background: "white",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    minHeight: "280px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #f1f5f9",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    maxHeight: "400px",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
  },
  emptyText: {
    margin: "16px 0 4px 0",
    fontSize: "16px",
    fontWeight: "600",
    color: "#64748b",
  },
  emptySubtext: {
    margin: 0,
    fontSize: "14px",
    color: "#94a3b8",
  },
  predictButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "18px",
    margin: "24px 20px 0",
    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    color: "white",
    border: "none",
    borderRadius: "16px",
    fontSize: "17px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 6px 24px rgba(245, 87, 108, 0.4)",
    transition: "all 0.3s ease",
  },
  predictButtonDisabled: {
    background: "#e2e8f0",
    color: "#94a3b8",
    boxShadow: "none",
    cursor: "not-allowed",
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "3px solid rgba(255, 255, 255, 0.3)",
    borderTop: "3px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  resultsSection: {
    padding: "24px 20px 0",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  resultCard: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    border: "2px solid #f1f5f9",
  },
  resultTitle: {
    margin: "0 0 20px 0",
    fontSize: "18px",
    fontWeight: "700",
    color: "#1e293b",
  },
  classificationBox: {
    background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "20px",
    border: "1px solid #e2e8f0",
  },
  classLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "6px",
  },
  className: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#667eea",
  },
  confidenceContainer: {
    marginTop: "16px",
  },
  confidenceLabel: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#475569",
  },
  confidenceValue: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#10b981",
  },
  progressBar: {
    width: "100%",
    height: "10px",
    background: "#f1f5f9",
    borderRadius: "10px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
    borderRadius: "10px",
    transition: "width 0.6s ease",
  },
  gradcamCard: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    border: "2px solid #fef3c7",
  },
  gradcamTitle: {
    margin: "0 0 8px 0",
    fontSize: "18px",
    fontWeight: "700",
    color: "#1e293b",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  gradcamIcon: {
    fontSize: "22px",
  },
  gradcamDesc: {
    margin: "0 0 16px 0",
    fontSize: "13px",
    color: "#64748b",
    lineHeight: "1.5",
  },
  gradcamBox: {
    borderRadius: "16px",
    overflow: "hidden",
    border: "3px solid #fef3c7",
    background: "#fffbeb",
  },
  gradcamImage: {
    width: "100%",
    display: "block",
  },
  heatmapLegend: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    marginTop: "16px",
    padding: "12px",
    background: "#fef3c7",
    borderRadius: "12px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
  },
  legendColor: {
    width: "16px",
    height: "16px",
    borderRadius: "4px",
    border: "1px solid rgba(0,0,0,0.1)",
  },
  footer: {
    padding: "24px 20px",
    marginTop: "24px",
  },
  footerContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
  },
  footerText: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "500",
  },
};

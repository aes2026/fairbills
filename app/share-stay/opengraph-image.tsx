import { ImageResponse } from "next/og";

export const alt = "FairBills told me to stay on my current plan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generated share card for the "stay recommended" outcome — the strongest
// brand statement FairBills makes: a comparison tool telling you NOT to switch.
// Note: Satori (next/og) requires every div with multiple children to declare
// display:flex, hence the explicit flex columns and no <br/> tags.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#173404",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              backgroundColor: "#1d9e75",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "26px",
              fontWeight: 700,
              marginRight: "16px",
            }}
          >
            F
          </div>
          <div style={{ color: "white", fontSize: "30px", fontWeight: 600 }}>FairBills</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: "white",
              fontSize: "62px",
              fontWeight: 600,
              letterSpacing: "-1.5px",
            }}
          >
            FairBills told me to stay
          </div>
          <div
            style={{
              display: "flex",
              color: "white",
              fontSize: "62px",
              fontWeight: 600,
              letterSpacing: "-1.5px",
            }}
          >
            on my current plan.
          </div>
          <div style={{ display: "flex", color: "#c0dd97", fontSize: "30px", marginTop: "28px" }}>
            No commissions. No kickbacks. Just honest advice.
          </div>
        </div>

        <div style={{ display: "flex", color: "#97c459", fontSize: "26px", fontWeight: 500 }}>
          fairbills.vercel.app
        </div>
      </div>
    ),
    { ...size },
  );
}

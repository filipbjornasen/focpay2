import React from "react";
import { Layout, Typography } from "antd";
import "./Receipt.css";

const { Content } = Layout;
const { Title, Text } = Typography;

function Receipt() {
  return (
    <Layout className="receipt-layout">
      <Content className="receipt-content">
        <div className="receipt-container">
          <div className="treasure-chest">
            <div className="receipt-logo">
              <img src="/favicon.png" alt="Foc Logo" className="logo-image" />
            </div>
            <Title level={1} className="receipt-title">
              Quest<br />
              <span style={{ fontSize: '1.6rem', letterSpacing: '1.5px' }}>Complete!</span>
            </Title>
            <Text className="receipt-message">
              Hail, brave champion of the Seven Seas! Thy legendary quest hath been
              fulfilled with valor and honor. The ancient treasures are now thine,
              thy bounty secured in the annals of maritime glory. May fair winds
              guide thy vessel to distant shores, and may fortune's golden smile
              forever light thy path across the boundless azure expanse!
            </Text>
            <div className="pirate-decorations">
              <span className="decoration" title="Anchor of the Seven Seas">⚓</span>
              <span className="decoration" title="Cutlass of the Forgotten">🗡️</span>
              <span className="decoration" title="Jewel of the Deep">💎</span>
              <span className="decoration" title="Phoenix Companion">🦜</span>
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
}

export default Receipt;

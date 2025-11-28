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
              Argh Pirate!
            </Title>
            <Text className="receipt-message">
              Take your mighty treasure and sail forth with joy!
            </Text>
            <div className="pirate-decorations">
              <span className="decoration">⚓</span>
              <span className="decoration">🗡️</span>
              <span className="decoration">💎</span>
              <span className="decoration">🦜</span>
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
}

export default Receipt;

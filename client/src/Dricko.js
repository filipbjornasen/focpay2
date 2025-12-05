import React, { useState, useEffect } from 'react';
import { Button, Layout, Typography, notification } from 'antd';
import './Dricko.css';

const { Content } = Layout;
const { Title, Text } = Typography;

function Dricko() {
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState('12'); // Default fallback price

  // Fetch current price when component mounts
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch('/api/settings/unit-price');
        if (response.ok) {
          const data = await response.json();
          setPrice(data.unitPrice);
        }
      } catch (error) {
        console.error('Failed to fetch price:', error);
        // Keep default price on error
      }
    };

    fetchPrice();
  }, []);

  const handleSwishPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/swish-dricko', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'dricko'
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Navigate to the Swish app using the redirectUrl
        if (data.redirectUrl) {
          window.location = data.redirectUrl;
        }

        notification.success({
          message: '⚔️ Quest Initiated!',
          description: 'The mystical portal to Swish realms awaits thee! Complete thy sacred transaction to claim thy bounty.',
          placement: 'topRight',
          duration: 5,
        });
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      notification.error({
        message: '🛡️ Quest Interrupted!',
        description: 'Dark forces have disrupted the payment enchantment. Muster thy courage and attempt the ritual once more!',
        placement: 'topRight',
        duration: 6,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="dricko-layout">
      <Content className="dricko-content">
        <div className="pirate-container">
          <div className="treasure-chest">
            <Title level={1} className="pirate-title">
              🏴‍☠️ Dricko's 🏴‍☠️
              <br />
              <span className="title-subtitle">Legendary Vault</span>
            </Title>
            <Text className="pirate-subtitle">
              Brave adventurer, ye have discovered the fabled treasure hoard!
              Complete thy quest with a tribute of gold...
            </Text>

            <Text className="price-text">
              <span style={{ marginRight: 12, marginLeft: 8 }}>🪙</span>
              {price} Crowns
              <span style={{ marginLeft: 12, marginRight: 8 }}>🪙</span>
            </Text>

            <div className="payment-section">
              <Button
                type="primary"
                size="large"
                loading={loading}
                onClick={handleSwishPayment}
                className="swish-button"
              >
                <span className="button-content">
                  <span className="button-main">
                    <span className="swish-icon-left">⚔️</span>
                    Claim Thy Bounty
                    <span className="swish-icon-right">⚔️</span>
                  </span>
                  <span className="button-subtext">with swish</span>
                </span>
              </Button>
            </div>

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

export default Dricko;
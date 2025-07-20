# Sound Files for Notifications

## 🔊 Ka-Ching Sound for New Customer Notifications

Add a `ka-ching.mp3` file to this directory for the new customer payment notification sound.

### **Recommended Sound Properties:**
- **Format**: MP3 or WAV
- **Duration**: 1-3 seconds
- **Volume**: Moderate (users should be able to hear it but not jarring)
- **Tone**: Pleasant, cash register-like sound or celebration chime

### **Sound Integration:**
```typescript
// Play sound when new customer notification arrives
const playKaChingSound = () => {
  const audio = new Audio('/sounds/ka-ching.mp3');
  audio.volume = 0.7; // 70% volume
  audio.play().catch(console.error);
};
```

### **Free Sound Resources:**
- **Zapsplat**: https://zapsplat.com (register for free sounds)
- **Freesound**: https://freesound.org (creative commons sounds)
- **Pixabay**: https://pixabay.com/sound-effects/ (royalty-free)

### **Example Usage:**
When a space owner receives a new customer notification, the ka-ching sound plays to create a satisfying "money earned" feeling, similar to Skool's approach.

### **Other Notification Sounds:**
You can also add other notification sounds:
- `notification.mp3` - General notification sound
- `mention.mp3` - Special sound for mentions
- `message.mp3` - Direct message sound

### **Browser Support:**
Modern browsers support MP3 and WAV. MP3 is recommended for smaller file sizes.
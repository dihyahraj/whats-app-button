import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState, useEffect } from "react";
import prisma from "../db.server";

// YEH LOADER AUTHENTICATION KE BAGHAIR CHALEGA
// Kyunke yeh customer ke liye hai, admin ke liye nahi.
export const loader = async ({ request }) => {
  // Hum shop ka domain URL se nikalenge
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Shop parameter missing" }, { status: 400 });
  }

  // Database se is shop ki settings fetch karein
  const settings = await prisma.widgetSettings.findUnique({
    where: { shop },
    include: { contacts: { orderBy: { createdAt: 'asc' } } },
  });

  // Agar settings nahi hain, to kuch na return karein
  if (!settings) {
    return json(null);
  }

  // Settings ko page par bhej dein
  return json(settings);
};

export default function AppEmbed() {
  const settings = useLoaderData();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  
  // Is state mein hum contacts ki availability store karenge
  const [availableContacts, setAvailableContacts] = useState([]);

  // Yeh effect page load hone par aur har minute chalega
  useEffect(() => {
    if (!settings || !settings.contacts) return;

    const checkAvailability = () => {
        const now = new Date();
        const updatedContacts = settings.contacts.map(contact => {
            if (!contact.startTime || !contact.endTime) {
                return {...contact, isAvailable: true}; // Agar time nahi hai to hamesha available
            }
            const start = new Date();
            const [startHours, startMinutes] = contact.startTime.split(':');
            start.setHours(startHours, startMinutes, 0);
            
            const end = new Date();
            const [endHours, endMinutes] = contact.endTime.split(':');
            end.setHours(endHours, endMinutes, 0);
            const isAvailable = now >= start && now <= end;
            return {...contact, isAvailable};
        });
        setAvailableContacts(updatedContacts);
    };

    checkAvailability(); // Pehli baar foran check karein
    const interval = setInterval(checkAvailability, 60000); // Har 60 second mein check karein
    return () => clearInterval(interval); // Cleanup
  }, [settings]);

  // Agar settings nahi hain ya widget disabled hai, to kuch bhi render na karein
  if (!settings || !settings.isEnabled) {
    return null;
  }

  const { buttonStyle, color, position } = settings;

  // CSS Styles
  const styles = `
    .whatsapp-fab {
      position: fixed;
      bottom: 25px;
      ${position}: 25px;
      width: 60px;
      height: 60px;
      background-color: ${color};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      cursor: pointer;
      z-index: 9999;
      border: none;
      transition: transform 0.2s ease;
    }
    .whatsapp-fab:hover {
      transform: scale(1.1);
    }
    .whatsapp-fab img {
      width: 32px;
      height: 32px;
    }
    .whatsapp-popup {
      position: fixed;
      bottom: 100px;
      ${position}: 25px;
      width: 350px;
      max-width: 90vw;
      background-color: white;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      z-index: 10000;
      overflow: hidden;
      opacity: ${isPopupOpen ? 1 : 0};
      transform: ${isPopupOpen ? 'translateY(0)' : 'translateY(20px)'};
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: ${isPopupOpen ? 'auto' : 'none'};
      font-family: -apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    }
    .whatsapp-popup-header {
      background-color: #075E54;
      color: white;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .whatsapp-popup-header h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }
    .whatsapp-popup-close {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      line-height: 1;
    }
    #whatsappContactList { list-style: none; padding: 0; margin: 0; }
    #whatsappContactList li a { display: flex; align-items: center; padding: 12px 20px; text-decoration: none; color: #333; border-bottom: 1px solid #f0f0f0;}
    #whatsappContactList li a:hover { background-color: #f6f6f6; }
    .contact-info { flex-grow: 1; }
    .contact-name { font-weight: 600; font-size: 15px; }
    .contact-subtitle { font-size: 13px; color: #666; }
    .availability-dot { width: 10px; height: 10px; border-radius: 50%; margin-left: 10px; }
    .availability-dot.available { background-color: #25D366; }
    .availability-dot.unavailable { background-color: #ccc; }
  `;
  
  // Edge Style ke liye alag se CSS
  const edgeStyles = `
    .whatsapp-fab.edge {
        width: 80px;
        height: 55px;
        border-radius: ${position === 'right' ? '28px 0 0 28px' : '0 28px 28px 0'};
    }
  `;

  return (
    <>
      <style>{styles}{buttonStyle === 'edge' && edgeStyles}</style>
      <button className={`whatsapp-fab ${buttonStyle}`} onClick={() => setIsPopupOpen(true)}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp"/>
      </button>

      <div className="whatsapp-popup">
        <div className="whatsapp-popup-header">
          <h2>Contact Us</h2>
          <button className="whatsapp-popup-close" onClick={() => setIsPopupOpen(false)}>×</button>
        </div>
        <ul id="whatsappContactList">
          {availableContacts.map(contact => (
            <li key={contact.id}>
              <a href={`https://wa.me/${contact.number.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                <div className="contact-info">
                  <span className="contact-name">{contact.name}</span>
                  <span className="contact-subtitle">{contact.subtitle}</span>
                </div>
                <div className={`availability-dot ${contact.isAvailable ? 'available' : 'unavailable'}`}></div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
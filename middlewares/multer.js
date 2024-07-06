import multer from "multer";

export const multerUpload = multer({
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
});

const singleAvatar = multerUpload.single("avatar");
const attachmentsMulter = multerUpload.array("files", 5);

export { singleAvatar, attachmentsMulter };

// Bilkul, Multer ek tool hai jo web applications mein files ko upload karne ko asaan banata hai. Jaise ki agar aap ek photo ya video ko kisi website pe upload karna chahte hain, toh Multer aapko uss process ko handle karne mein madad karta hai.

// Yeh kaam kaise karta hai? Imagine karo ki aap kisi website pe photo upload kar rahe ho. Jab aap submit button dabate ho, toh wo photo server tak pahunchti hai. Lekin server ko samajhna hota hai ki wo photo kya hai, kis format mein hai, aur kahan save karni hai. Yahaan Multer kaam aata hai. Wo server ko samajhne mein madad karta hai aur photo ko sahi jagah pe save karta hai.

// Toh, Multer basically ek madadgar hai jo file uploads ko handle karta hai, aur aapko uss process ko asaan banata hai, bina aapko bahut zyada code likhne ki zaroorat.

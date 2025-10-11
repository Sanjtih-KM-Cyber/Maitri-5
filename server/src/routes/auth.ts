import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Astronaut } from '../db';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req: express.Request, res: express.Response) => {
    const { name, password, securityQuestion, securityAnswer } = req.body;

    if (!name || !password || !securityQuestion || !securityAnswer) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    try {
        let user = await User.findOne({ name: name.toLowerCase() });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const newUser = new User({
            name,
            password,
            securityQuestion,
            securityAnswer,
            type: 'astronaut'
        });

        const newAstronautData = new Astronaut({
             name, 
             designation: 'New Recruit', 
             missionTasks: [], symptomLogs: [], captainLogs: [], doctorAdvice: [], 
             massProtocols: [], procedures: [], dailyCheckInLogs: [],
             earthlinkMessages: [],
        });
        
        await newUser.save();
        await newAstronautData.save();

        res.status(201).json(newAstronautData);

    } catch (err) {
        if (err instanceof Error) console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/auth/login
router.post('/login', async (req: express.Request, res: express.Response) => {
    const { name, password, type } = req.body;
    if (!name || !password || !type) {
        return res.status(400).json({ message: 'Please provide name, password, and type' });
    }

    try {
        const user = await User.findOne({ name: name.toLowerCase(), type }).select('+password');
        if (!user || !user.password) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                name: user.name,
                type: user.type
            },
        };

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) throw new Error('JWT_SECRET is not defined');

        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );

    } catch (err) {
        if (err instanceof Error) console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- Forgot Password Flow ---
router.post('/forgot-password/start', async (req: express.Request, res: express.Response) => {
    const { name } = req.body;
    try {
        const user = await User.findOne({ name: name.toLowerCase() });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ question: user.securityQuestion });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/forgot-password/verify', async (req: express.Request, res: express.Response) => {
    const { name, answer } = req.body;
    try {
        const user = await User.findOne({ name: name.toLowerCase() }).select('+securityAnswer');
        if (!user || !user.securityAnswer) return res.status(404).json({ message: 'User not found' });
        if (user.securityAnswer.toLowerCase() !== answer.toLowerCase()) {
            return res.status(400).json({ message: 'Incorrect answer' });
        }
        res.status(200).json({ message: 'Verification successful' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/forgot-password/reset', async (req: express.Request, res: express.Response) => {
    const { name, answer, newPassword } = req.body;
     try {
        const user = await User.findOne({ name: name.toLowerCase() }).select('+securityAnswer +password');
        if (!user || !user.securityAnswer) return res.status(404).json({ message: 'User not found' });
        if (user.securityAnswer.toLowerCase() !== answer.toLowerCase()) {
            return res.status(400).json({ message: 'Incorrect answer' });
        }
        user.password = newPassword;
        await user.save();
        res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});


export default router;
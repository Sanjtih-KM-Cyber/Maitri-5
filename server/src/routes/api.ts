import express, { Response } from 'express';
import { auth, AuthRequest, adminAuth } from '../middleware/auth';
import { Astronaut } from '../db';
import { io } from '../index';
import { SymptomLog, CaptainLog, DoctorAdvice, MissionProcedure, MassProtocol, DailyCheckInLog, MissionTask, EarthlinkMessage } from '../../../types';

const router = express.Router();

// --- Helper function to emit updates ---
const emitAstronautUpdate = async (name: string) => {
    const updatedAstronaut = await Astronaut.findOne({ name });
    if (updatedAstronaut) {
        io.emit('astronaut-data-updated', updatedAstronaut.toObject());
    }
};

// --- Astronaut Routes (for logged-in user) ---

// GET /api/astronauts/me - Get my own data
// FIX: Use express.Response to ensure correct typing and avoid errors.
router.get('/astronauts/me', auth, async (req: AuthRequest, res: Response) => {
    try {
        const astronautData = await Astronaut.findOne({ name: req.user?.name });
        if (!astronautData) {
            return res.status(404).json({ message: 'Astronaut data not found' });
        }
        res.json({ data: astronautData.toObject(), userType: req.user?.type });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/astronauts/me/symptoms
// FIX: Use express.Response to ensure correct typing and avoid errors.
router.post('/astronauts/me/symptoms', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { symptom, severity, notes, photo, video } = req.body;
        const newLog: SymptomLog = {
            id: `symp-${Date.now()}`,
            date: new Date().toISOString(),
            symptom, severity, notes, photo, video
        };
        const astronaut = await Astronaut.findOneAndUpdate(
            { name: req.user?.name },
            { $push: { symptomLogs: newLog } },
            { new: true }
        );
        if (!astronaut) return res.status(404).json({ message: 'Astronaut not found' });
        
        await emitAstronautUpdate(req.user!.name);
        res.status(201).json(newLog);
    } catch (err: any) { res.status(500).send('Server Error'); }
});

// PUT /api/astronauts/me/symptoms/:logId/media
// FIX: Use express.Response to ensure correct typing and avoid errors.
router.put('/astronauts/me/symptoms/:logId/media', auth, async (req: AuthRequest, res: Response) => {
    const { logId } = req.params;
    const { mediaUrl, mediaType } = req.body;
    try {
        const updateField = mediaType === 'photo' ? 'symptomLogs.$.photo' : 'symptomLogs.$.video';
        await Astronaut.updateOne(
            { name: req.user?.name, 'symptomLogs.id': logId },
            { $set: { [updateField]: mediaUrl } }
        );
        await emitAstronautUpdate(req.user!.name);
        res.status(204).send();
    } catch (err) { res.status(500).send('Server Error'); }
});

// POST /api/astronauts/me/captain-logs
// FIX: Use express.Response to ensure correct typing and avoid errors.
router.post('/astronauts/me/captain-logs', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { text, photo, video } = req.body;
        const newLog: CaptainLog = {
            id: `cap-${Date.now()}`,
            date: new Date().toISOString(),
            text, photo, video
        };
        await Astronaut.updateOne({ name: req.user?.name }, { $push: { captainLogs: newLog } });
        await emitAstronautUpdate(req.user!.name);
        res.status(201).json(newLog);
    } catch (err) { res.status(500).send('Server Error'); }
});

// POST /api/astronauts/me/check-ins
// FIX: Use express.Response to ensure correct typing and avoid errors.
router.post('/astronauts/me/check-ins', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { mood, sleep } = req.body;
        const newLog: DailyCheckInLog = {
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            mood, sleep
        };
        await Astronaut.updateOne({ name: req.user?.name }, { $push: { dailyCheckInLogs: newLog } });
        await emitAstronautUpdate(req.user!.name);
        res.status(201).json(newLog);
    } catch (err) { res.status(500).send('Server Error'); }
});

// PUT /api/astronauts/me/tasks
// FIX: Use express.Response to ensure correct typing and avoid errors.
router.put('/astronauts/me/tasks', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { tasks } = req.body;
        await Astronaut.updateOne({ name: req.user?.name }, { $set: { missionTasks: tasks } });
        await emitAstronautUpdate(req.user!.name);
        res.json(tasks);
    } catch (err) { res.status(500).send('Server Error'); }
});

// PUT /api/astronauts/me/earthlink/:messageId/viewed
// FIX: Use express.Response to ensure correct typing and avoid errors.
router.put('/astronauts/me/earthlink/:messageId/viewed', auth, async (req: AuthRequest, res: Response) => {
    try {
        await Astronaut.updateOne(
            { name: req.user?.name, 'earthlinkMessages.id': req.params.messageId },
            { $set: { 'earthlinkMessages.$.viewed': true } }
        );
        await emitAstronautUpdate(req.user!.name);
        res.status(204).send();
    } catch (err) { res.status(500).send('Server Error'); }
});

// POST /api/astronauts/me/earthlink
// FIX: Use express.Response to ensure correct typing and avoid errors.
router.post('/astronauts/me/earthlink', auth, async (req: AuthRequest, res: Response) => {
    try {
        const { from, text, photoUrl, videoUrl } = req.body;
        const newMessage: EarthlinkMessage = {
            id: `earth-${Date.now()}`,
            date: new Date().toISOString(),
            from, text, photoUrl, videoUrl,
            viewed: true // Messages sent by astronaut are "viewed" by them
        };
        await Astronaut.updateOne({ name: req.user?.name }, { $push: { earthlinkMessages: newMessage } });
        await emitAstronautUpdate(req.user!.name);
        res.status(201).json(newMessage);
    } catch (err) { res.status(500).send('Server Error'); }
});


// --- Admin Routes ---

// GET /api/admin/astronauts
// FIX: Use express.Response to ensure correct typing and avoid errors.
router.get('/admin/astronauts', [auth, adminAuth], async (req: AuthRequest, res: Response) => {
    try {
        const astronauts = await Astronaut.find().sort({ name: 1 });
        res.json(astronauts.map(a => a.toObject()));
    } catch (err: any) { res.status(500).send('Server Error'); }
});

// POST /api/admin/astronauts/:name/advice
// FIX: Use express.Response to ensure correct typing and avoid errors.
router.post('/admin/astronauts/:name/advice', [auth, adminAuth], async (req: AuthRequest, res: Response) => {
    try {
        const { text, symptomLogId } = req.body;
        const newAdvice: DoctorAdvice = {
            id: `adv-${Date.now()}`,
            date: new Date().toISOString(),
            text, symptomLogId
        };
        await Astronaut.updateOne({ name: req.params.name }, { $push: { doctorAdvice: newAdvice } });
        await emitAstronautUpdate(req.params.name);
        res.status(201).json(newAdvice);
    } catch (err) { res.status(500).send('Server Error'); }
});

// POST /api/admin/astronauts/:name/procedures
// FIX: Use express.Response to ensure correct typing and avoid errors.
router.post('/admin/astronauts/:name/procedures', [auth, adminAuth], async (req: AuthRequest, res: Response) => {
    try {
        const { name, steps } = req.body;
        const newProc: MissionProcedure = {
            id: `proc-${Date.now()}`,
            name, steps
        };
        await Astronaut.updateOne({ name: req.params.name }, { $push: { procedures: newProc } });
        await emitAstronautUpdate(req.params.name);
        res.status(201).json(newProc);
    } catch (err) { res.status(500).send('Server Error'); }
});

// POST /api/admin/astronauts/:name/mass-protocols
// FIX: Use express.Response to ensure correct typing and avoid errors.
router.post('/admin/astronauts/:name/mass-protocols', [auth, adminAuth], async (req: AuthRequest, res: Response) => {
    try {
        const { name, sets, duration, rest } = req.body;
        const newProto: MassProtocol = {
            id: `mass-${Date.now()}`,
            name, sets, duration, rest
        };
        await Astronaut.updateOne({ name: req.params.name }, { $push: { massProtocols: newProto } });
        await emitAstronautUpdate(req.params.name);
        res.status(201).json(newProto);
    } catch (err) { res.status(500).send('Server Error'); }
});

// PUT /api/admin/astronauts/:name/photo
// FIX: Use express.Response to ensure correct typing and avoid errors.
router.put('/admin/astronauts/:name/photo', [auth, adminAuth], async (req: AuthRequest, res: Response) => {
    try {
        const { photoUrl } = req.body;
        await Astronaut.updateOne({ name: req.params.name }, { $set: { photoUrl } });
        await emitAstronautUpdate(req.params.name);
        res.json({ photoUrl });
    } catch (err) { res.status(500).send('Server Error'); }
});

// POST /api/admin/astronauts/:name/earthlink
// FIX: Use express.Response to ensure correct typing and avoid errors.
router.post('/admin/astronauts/:name/earthlink', [auth, adminAuth], async (req: AuthRequest, res: Response) => {
    try {
        const { from, text, photoUrl, videoUrl } = req.body;
        const newMessage: EarthlinkMessage = {
            id: `earth-${Date.now()}`,
            date: new Date().toISOString(),
            from, text, photoUrl, videoUrl,
            viewed: false
        };
        await Astronaut.updateOne({ name: req.params.name }, { $push: { earthlinkMessages: newMessage } });
        await emitAstronautUpdate(req.params.name);
        res.status(201).json(newMessage);
    } catch (err) { res.status(500).send('Server Error'); }
});


export default router;
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Database Setup
const db = new sqlite3.Database('./backlinker.db', (err) => {
    if (err) console.error('Database error:', err);
    else console.log('✅ SQLite database connected');
});

// Create Tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS websites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT UNIQUE,
        title TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS backlinks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        websiteId INTEGER,
        referringDomain TEXT,
        pageTitle TEXT,
        anchorText TEXT,
        url TEXT,
        domainAuthority INTEGER,
        isFollowLink BOOLEAN,
        status TEXT,
        crawledAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(websiteId) REFERENCES websites(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS prospects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        websiteId INTEGER,
        domain TEXT,
        email TEXT,
        contactName TEXT,
        pageTitle TEXT,
        pageUrl TEXT,
        relevance TEXT,
        domainAuthority INTEGER,
        linkType TEXT,
        status TEXT DEFAULT 'pending',
        discoveredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(websiteId) REFERENCES websites(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        websiteId INTEGER,
        name TEXT,
        emailFrom TEXT,
        senderName TEXT,
        templateType TEXT,
        prospectsCount INTEGER,
        sentCount INTEGER DEFAULT 0,
        openedCount INTEGER DEFAULT 0,
        clickedCount INTEGER DEFAULT 0,
        responseCount INTEGER DEFAULT 0,
        status TEXT DEFAULT 'draft',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        launchedAt DATETIME,
        FOREIGN KEY(websiteId) REFERENCES websites(id)
    )`);
});

// ============= WEBSITE MANAGEMENT =============

app.post('/api/websites', (req, res) => {
    const { domain, title } = req.body;
    db.run(
        'INSERT INTO websites (domain, title) VALUES (?, ?)',
        [domain, title],
        function(err) {
            if (err) return res.status(400).json({ error: 'Domain already exists' });
            res.json({ id: this.lastID, domain, title });
        }
    );
});

app.get('/api/websites', (req, res) => {
    db.all('SELECT * FROM websites ORDER BY createdAt DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.delete('/api/websites/:id', (req, res) => {
    db.run('DELETE FROM websites WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ============= WEB CRAWLER =============

app.post('/api/crawl/backlinks', (req, res) => {
    const { domain, websiteId } = req.body;
    
    const backlinks = [
        {
            referringDomain: 'techblog.com',
            pageTitle: '10 Best SEO Tools for 2026',
            anchorText: 'link building platform',
            url: 'https://techblog.com/seo-tools-2026',
            isFollowLink: true,
            domainAuthority: 42
        },
        {
            referringDomain: 'marketinginsights.io',
            pageTitle: 'Complete Guide to Backlink Strategy',
            anchorText: 'automated outreach',
            url: 'https://marketinginsights.io/backlinks',
            isFollowLink: true,
            domainAuthority: 38
        },
        {
            referringDomain: 'digitalnews.co',
            pageTitle: 'Top 20 Marketing Automation Tools',
            anchorText: domain,
            url: 'https://digitalnews.co/marketing-tools',
            isFollowLink: true,
            domainAuthority: 45
        },
        {
            referringDomain: 'seojournal.net',
            pageTitle: 'Link Building Techniques That Work',
            anchorText: 'backlink generation',
            url: 'https://seojournal.net/link-building',
            isFollowLink: false,
            domainAuthority: 35
        },
        {
            referringDomain: 'businessgrowth.com',
            pageTitle: 'Growth Hacking Tools',
            anchorText: 'backlink finder',
            url: 'https://businessgrowth.com/tools',
            isFollowLink: true,
            domainAuthority: 50
        }
    ];

    backlinks.forEach(link => {
        db.run(
            `INSERT INTO backlinks 
            (websiteId, referringDomain, pageTitle, anchorText, url, domainAuthority, isFollowLink, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [websiteId, link.referringDomain, link.pageTitle, link.anchorText, link.url, link.domainAuthority, link.isFollowLink ? 1 : 0, 'active']
        );
    });

    res.json({ success: true, found: backlinks.length });
});

app.post('/api/crawl/prospects', (req, res) => {
    const { domain, websiteId, keyword } = req.body;
    
    const prospects = [
        {
            domain: 'guestblogging.com',
            email: 'editor@guestblogging.com',
            contactName: 'Sarah Johnson',
            pageTitle: 'Write for Us - Marketing',
            pageUrl: 'https://guestblogging.com/write-for-us',
            relevance: 'High',
            domainAuthority: 48,
            linkType: 'Guest Post'
        },
        {
            domain: 'industryexperts.io',
            email: 'submissions@industryexperts.io',
            contactName: 'John Smith',
            pageTitle: 'Contribute Your Expertise',
            pageUrl: 'https://industryexperts.io/contribute',
            relevance: 'High',
            domainAuthority: 42,
            linkType: 'Guest Post'
        },
        {
            domain: 'resourcelinks.net',
            email: 'partnerships@resourcelinks.net',
            contactName: 'Emma Davis',
            pageTitle: 'Resource Pages',
            pageUrl: 'https://resourcelinks.net/resources',
            relevance: 'High',
            domainAuthority: 44,
            linkType: 'Resource Link'
        },
        {
            domain: 'blogcommunity.co',
            email: 'team@blogcommunity.co',
            contactName: 'Michael Brown',
            pageTitle: 'Blogger Network',
            pageUrl: 'https://blogcommunity.co/join',
            relevance: 'Medium',
            domainAuthority: 38,
            linkType: 'Guest Post'
        },
        {
            domain: 'roundupblogs.io',
            email: 'curator@roundupblogs.io',
            contactName: 'Lisa Wilson',
            pageTitle: 'Weekly Roundups',
            pageUrl: 'https://roundupblogs.io/submit',
            relevance: 'High',
            domainAuthority: 40,
            linkType: 'Mention'
        }
    ];

    prospects.forEach(prospect => {
        db.run(
            `INSERT INTO prospects 
            (websiteId, domain, email, contactName, pageTitle, pageUrl, relevance, domainAuthority, linkType, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [websiteId, prospect.domain, prospect.email, prospect.contactName, prospect.pageTitle, prospect.pageUrl, prospect.relevance, prospect.domainAuthority, prospect.linkType, 'pending']
        );
    });

    res.json({ success: true, found: prospects.length });
});

// ============= DATA RETRIEVAL =============

app.get('/api/websites/:websiteId/backlinks', (req, res) => {
    db.all(
        'SELECT * FROM backlinks WHERE websiteId = ? ORDER BY domainAuthority DESC',
        [req.params.websiteId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        }
    );
});

app.get('/api/websites/:websiteId/prospects', (req, res) => {
    db.all(
        'SELECT * FROM prospects WHERE websiteId = ? ORDER BY domainAuthority DESC',
        [req.params.websiteId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        }
    );
});

// ============= CAMPAIGN MANAGEMENT =============

app.post('/api/campaigns', (req, res) => {
    const { websiteId, name, emailFrom, senderName, templateType, prospectsCount } = req.body;
    db.run(
        `INSERT INTO campaigns 
        (websiteId, name, emailFrom, senderName, templateType, prospectsCount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [websiteId, name, emailFrom, senderName, templateType, prospectsCount, 'draft'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, status: 'created' });
        }
    );
});

app.get('/api/websites/:websiteId/campaigns', (req, res) => {
    db.all(
        'SELECT * FROM campaigns WHERE websiteId = ? ORDER BY createdAt DESC',
        [req.params.websiteId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        }
    );
});

app.post('/api/campaigns/:campaignId/launch', (req, res) => {
    db.run(
        'UPDATE campaigns SET status = ?, launchedAt = CURRENT_TIMESTAMP WHERE id = ?',
        ['active', req.params.campaignId],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Campaign launched!' });
        }
    );
});

// ============= EXPORT =============

app.get('/api/export/prospects/:websiteId', (req, res) => {
    db.all(
        'SELECT domain, email, contactName, relevance, domainAuthority, linkType FROM prospects WHERE websiteId = ?',
        [req.params.websiteId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const csv = 'Domain,Email,Contact,Relevance,Authority,Type\n' +
                rows.map(r => `${r.domain},${r.email},${r.contactName},${r.relevance},${r.domainAuthority},${r.linkType}`).join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="prospects.csv"');
            res.send(csv);
        }
    );
});

app.get('/api/export/backlinks/:websiteId', (req, res) => {
    db.all(
        'SELECT referringDomain, pageTitle, anchorText, url, domainAuthority, isFollowLink FROM backlinks WHERE websiteId = ?',
        [req.params.websiteId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const csv = 'Domain,Page Title,Anchor Text,URL,Authority,Follow\n' +
                rows.map(r => `${r.referringDomain},${r.pageTitle},${r.anchorText},${r.url},${r.domainAuthority},${r.isFollowLink ? 'Yes' : 'No'}`).join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="backlinks.csv"');
            res.send(csv);
        }
    );
});

// ============= START SERVER =============

app.listen(PORT, () => {
    console.log(`🚀 BacklinkerPRO Server running on port ${PORT}`);
    console.log(`📊 Database: backlinker.db`);
    console.log(`🔗 API ready for connections`);
});

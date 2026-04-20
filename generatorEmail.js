import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

const generatorEmail = {
    api: {
        base: 'https://generator.email/',
        validate: 'check_adres_validation3.php'
    },

    h: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Upgrade-Insecure-Requests': '1'
    },

    _cookie: '',

    _f: async function(u, o, r = 5) {
        for (let i = 0, e; i < r; i++) {
            try {
                const fetchOptions = {
                    ...o,
                    redirect: 'manual' // Jangan auto follow, kita handle manual
                };
                if (this._cookie) {
                    fetchOptions.headers = fetchOptions.headers || {};
                    fetchOptions.headers.Cookie = this._cookie;
                }
                const res = await fetch(u, fetchOptions);

                // Tangkap cookie dari response (termasuk redirect 302)
                const setCookie = res.headers.get('set-cookie');
                if (setCookie) {
                    const match = setCookie.match(/surl=([^;]+)/);
                    if (match) this._cookie = `surl=${match[1]}`;
                }

                // Jika redirect, panggil URL baru dengan cookie yang sudah didapat
                if (res.status === 301 || res.status === 302) {
                    const location = res.headers.get('location');
                    if (location) {
                        return this._f(location, o, r); // Rekursif dengan URL baru
                    }
                }

                return o._t ? await res.text() : await res.json();
            } catch (err) {
                e = err.message;
                if (i === r - 1) throw new Error(e);
            }
        }
    },

    _v: async function(u, d) {
        try {
            return await this._f(this.api.base + this.api.validate, {
                method: 'POST',
                headers: {
                    ...this.h,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    usr: u,
                    dmn: d
                })
            });
        } catch (e) {
            return {
                err: e.message
            };
        }
    },

    _p: (e) => e?.includes('@') ? e.split('@') : null,

    generate: async function(domain = '') {
        try {
            // Langkah 1: Akses domain custom untuk dapat cookie
            const initUrl = domain ? this.api.base + domain : this.api.base;
            await this._f(initUrl, {
                headers: this.h,
                cache: 'no-store',
                _t: 1
            });

            // Langkah 2: Ambil halaman utama dengan cookie yang sudah disimpan
            const $ = cheerio.load(await this._f(this.api.base, {
                headers: this.h,
                cache: 'no-store',
                _t: 1
            }));

            const em = $('#email_ch_text').text();
            if (!em) return {
                success: false,
                result: 'Gagal generate email'
            };

            const [u, d] = this._p(em);
            const v = await this._v(u, d);
            return {
                success: true,
                result: {
                    email: em,
                    emailStatus: v.status || null,
                    uptime: v.uptime || null,
                    ...(v.err && { error: v.err })
                }
            };
        } catch (e) {
            return {
                success: false,
                result: e.message
            };
        }
    },

    validation: async function(em) {
        const p = this._p(em);
        if (!p) return {
            success: false,
            result: 'Email tidak boleh kosong'
        };

        const [u, d] = p, v = await this._v(u, d);
        return {
            success: true,
            result: {
                email: em,
                emailStatus: v.status || null,
                uptime: v.uptime || null,
                ...(v.err && { error: v.err })
            }
        };
    },

    inbox: async function(em) {
        const p = this._p(em);
        if (!p) return {
            success: false,
            result: 'Email tidak boleh kosong'
        };

        const [u, d] = p, v = await this._v(u, d), ck = `surl=${d}/${u}`;
        let h;
        try {
            h = await this._f(this.api.base, {
                headers: {
                    ...this.h,
                    Cookie: ck
                },
                cache: 'no-store',
                _t: 1
            });
        } catch (e) {
            return {
                success: true,
                result: {
                    email: em,
                    emailStatus: v.status,
                    uptime: v.uptime,
                    inbox: [],
                    error: e.message
                }
            };
        }

        const $ = cheerio.load(h),
            c = parseInt($('#mess_number').text()) || 0,
            ib = [];

        if (c === 1) {
            const el = $('#email-table .e7m.row'),
                sp = el.find('.e7m.col-md-9 span');
            const messageEl = el.find('.e7m.mess_bodiyy');
            const links = [];
            el.find('.e7m.mess_bodiyy a').each((i, el) => {
                let href = $(el).attr('href');
                if (href) {
                    if (!href.startsWith('http')) {
                        href = new URL(href, this.api.base).href;
                    }
                    links.push(href);
                }
            });
            ib.push({
                from: sp.eq(3).text().replace(/\(.*?\)/, '').trim(),
                to: sp.eq(1).text(),
                created: el.find('.e7m.tooltip').text().replace('Created: ', ''),
                subject: el.find('h1').text(),
                message: messageEl.text().trim(),
                links: links
            });
        }

        return {
            success: true,
            result: {
                email: em,
                emailStatus: v.status,
                uptime: v.uptime,
                inbox: ib
            }
        };
    }
};

export default generatorEmail;

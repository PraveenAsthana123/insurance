--
-- PostgreSQL database dump
--

\restrict cUmHSwotRuydphdEDxFQbngGGBBZilN1s2tLXZBF2rovgjygi1dRfNJWoZmOvHI

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: autonomous_agent_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.autonomous_agent_runs (
    id integer NOT NULL,
    run_ref text NOT NULL,
    objective text NOT NULL,
    strategy jsonb NOT NULL,
    decisions jsonb DEFAULT '[]'::jsonb,
    iterations_run integer DEFAULT 0 NOT NULL,
    campaigns_created integer DEFAULT 0 NOT NULL,
    final_conversion_rate double precision,
    final_consent_rate double precision,
    final_outcome_score double precision,
    fairness_di double precision,
    rai_pass boolean,
    status text DEFAULT 'running'::text NOT NULL,
    halt_reason text,
    correlation_id text,
    tenant_id text DEFAULT 'default'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: autonomous_agent_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.autonomous_agent_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: autonomous_agent_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.autonomous_agent_runs_id_seq OWNED BY public.autonomous_agent_runs.id;


--
-- Name: decision_corrections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.decision_corrections (
    id integer NOT NULL,
    correction_ref text NOT NULL,
    run_ref text NOT NULL,
    decision_iter integer NOT NULL,
    decision_action text NOT NULL,
    ai_decision jsonb NOT NULL,
    human_decision jsonb NOT NULL,
    reason text NOT NULL,
    reviewer text NOT NULL,
    correlation_id text,
    tenant_id text DEFAULT 'default'::text NOT NULL,
    use_for_training boolean DEFAULT true NOT NULL,
    severity text DEFAULT 'minor'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: decision_corrections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.decision_corrections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: decision_corrections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.decision_corrections_id_seq OWNED BY public.decision_corrections.id;


--
-- Name: decision_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.decision_feedback (
    id integer NOT NULL,
    feedback_ref text NOT NULL,
    run_ref text NOT NULL,
    decision_iter integer NOT NULL,
    decision_action text NOT NULL,
    feedback_kind text NOT NULL,
    feedback_value text NOT NULL,
    note text,
    reviewer text NOT NULL,
    correlation_id text,
    tenant_id text DEFAULT 'default'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT decision_feedback_kind_chk CHECK ((feedback_kind = ANY (ARRAY['explicit'::text, 'implicit'::text]))),
    CONSTRAINT decision_feedback_value_chk CHECK ((((feedback_kind = 'explicit'::text) AND (feedback_value = ANY (ARRAY['good'::text, 'bad'::text, 'correct'::text, 'incorrect'::text]))) OR ((feedback_kind = 'implicit'::text) AND (feedback_value = ANY (ARRAY['accepted'::text, 'modified'::text, 'rejected'::text, 'ignored'::text])))))
);


--
-- Name: decision_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.decision_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: decision_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.decision_feedback_id_seq OWNED BY public.decision_feedback.id;


--
-- Name: autonomous_agent_runs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autonomous_agent_runs ALTER COLUMN id SET DEFAULT nextval('public.autonomous_agent_runs_id_seq'::regclass);


--
-- Name: decision_corrections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_corrections ALTER COLUMN id SET DEFAULT nextval('public.decision_corrections_id_seq'::regclass);


--
-- Name: decision_feedback id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_feedback ALTER COLUMN id SET DEFAULT nextval('public.decision_feedback_id_seq'::regclass);


--
-- Data for Name: autonomous_agent_runs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.autonomous_agent_runs (id, run_ref, objective, strategy, decisions, iterations_run, campaigns_created, final_conversion_rate, final_consent_rate, final_outcome_score, fairness_di, rai_pass, status, halt_reason, correlation_id, tenant_id, started_at, completed_at) FROM stdin;
1	AGENT-8BE57EFDD6	Test gold-tier engagement uplift	{"channel": "survey", "segment": "gold", "fallback_order": ["form", "email"]}	[{"action": "create_campaign", "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T01:25:30.804743+00:00", "campaign_id": 15, "metric_observed": null}, {"action": "execute_campaign", "iteration": 1, "reasoning": "runs_created=1 · skipped_consent=0 · skipped_segment=2", "timestamp": "2026-06-09T01:25:30.842616+00:00", "campaign_id": 15, "metric_observed": null}, {"action": "measure", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 1}", "timestamp": "2026-06-09T01:25:30.881151+00:00", "campaign_id": 15, "metric_observed": 0.6}, {"action": "halt_objective_met", "iteration": 1, "reasoning": "target conversion_rate 0.30 reached (0.60) · halting", "timestamp": "2026-06-09T01:25:30.881178+00:00", "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	complete	halt_objective_met	cd7e72c60cf5499f	default	2026-06-09 01:25:30.789868+00	2026-06-09 01:25:30.890181+00
56	AGENT-443ADBF229	T7.9 confidence routing test 5cdd5e	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T06:25:32.166312+00:00", "confidence": null, "campaign_id": 408, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T06:25:32.219773+00:00", "confidence": null, "campaign_id": 408, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T06:25:32.257013+00:00", "confidence": 0.568, "campaign_id": 408, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T06:25:32.257047+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	82486685f0b847c1	default	2026-06-09 06:25:32.151992+00	2026-06-09 06:25:32.265495+00
2	AGENT-85C4E63DA4	End-to-end autonomous campaign test	{"channel": "survey", "segment": "gold", "fallback_order": ["form"]}	[{"action": "create_campaign", "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T01:26:46.374095+00:00", "campaign_id": 16, "metric_observed": null}, {"action": "execute_campaign", "iteration": 1, "reasoning": "runs_created=1 · skipped_consent=0 · skipped_segment=2", "timestamp": "2026-06-09T01:26:46.419791+00:00", "campaign_id": 16, "metric_observed": null}, {"action": "measure", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 1}", "timestamp": "2026-06-09T01:26:46.459251+00:00", "campaign_id": 16, "metric_observed": 0.6}, {"action": "halt_objective_met", "iteration": 1, "reasoning": "target conversion_rate 0.30 reached (0.60) · halting", "timestamp": "2026-06-09T01:26:46.459278+00:00", "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	complete	halt_objective_met	9d49e2233c4145ac	default	2026-06-09 01:26:46.358045+00	2026-06-09 01:26:46.468872+00
64	AGENT-3452127E2B	T7.9 confidence routing test 89d13d	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T07:09:50.560890+00:00", "confidence": null, "campaign_id": 444, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T07:09:50.607049+00:00", "confidence": null, "campaign_id": 444, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T07:09:50.644384+00:00", "confidence": 0.568, "campaign_id": 444, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T07:09:50.644411+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	d8f1b877c54744c0	default	2026-06-09 07:09:50.546115+00	2026-06-09 07:09:50.653672+00
47	AGENT-766C90D440	T7.9 confidence routing test 0d89ff	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T06:17:09.032166+00:00", "confidence": null, "campaign_id": 371, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T06:17:09.076584+00:00", "confidence": null, "campaign_id": 371, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T06:17:09.115971+00:00", "confidence": 0.568, "campaign_id": 371, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T06:17:09.115996+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	5a08ff8530b24439	default	2026-06-09 06:17:09.0167+00	2026-06-09 06:17:09.125663+00
48	AGENT-C15091DB4A	T7.9 confidence routing test af6ca7	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T06:17:16.653357+00:00", "confidence": null, "campaign_id": 372, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T06:17:16.697319+00:00", "confidence": null, "campaign_id": 372, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T06:17:16.731173+00:00", "confidence": 0.568, "campaign_id": 372, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T06:17:16.731200+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	b47bead25e064b65	default	2026-06-09 06:17:16.624314+00	2026-06-09 06:17:16.739872+00
60	AGENT-0682AF189D	T7.9 confidence routing test a89f92	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T06:59:16.647577+00:00", "confidence": null, "campaign_id": 426, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T06:59:16.706949+00:00", "confidence": null, "campaign_id": 426, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T06:59:16.755445+00:00", "confidence": 0.568, "campaign_id": 426, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T06:59:16.755473+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	a273ccc574eb44b0	default	2026-06-09 06:59:16.632472+00	2026-06-09 06:59:16.767203+00
52	AGENT-D869F58B96	T7.9 confidence routing test f7d05d	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T06:19:05.424225+00:00", "confidence": null, "campaign_id": 390, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T06:19:05.473307+00:00", "confidence": null, "campaign_id": 390, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T06:19:05.509202+00:00", "confidence": 0.568, "campaign_id": 390, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T06:19:05.509231+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	99cfb6c540284f34	default	2026-06-09 06:19:05.409166+00	2026-06-09 06:19:05.518445+00
72	AGENT-17A582DB65	T7.9 confidence routing test 6feedf	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T07:17:14.257781+00:00", "confidence": null, "campaign_id": 480, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T07:17:14.297440+00:00", "confidence": null, "campaign_id": 480, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T07:17:14.330946+00:00", "confidence": 0.568, "campaign_id": 480, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T07:17:14.330973+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	8ba6a8bdfdc542b9	default	2026-06-09 07:17:14.243473+00	2026-06-09 07:17:14.339781+00
76	AGENT-E672762963	T7.9 confidence routing test 9ad006	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T07:20:01.061715+00:00", "confidence": null, "campaign_id": 498, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T07:20:01.110837+00:00", "confidence": null, "campaign_id": 498, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T07:20:01.148651+00:00", "confidence": 0.568, "campaign_id": 498, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T07:20:01.148679+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	88905e11c3ba4338	default	2026-06-09 07:20:01.047332+00	2026-06-09 07:20:01.158145+00
88	AGENT-6D22C3A46F	T7.9 confidence routing test 09d6dc	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T15:16:34.788764+00:00", "confidence": null, "campaign_id": 552, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T15:16:34.843424+00:00", "confidence": null, "campaign_id": 552, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T15:16:34.897380+00:00", "confidence": 0.568, "campaign_id": 552, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T15:16:34.897421+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	fb1078b826234c18	default	2026-06-09 15:16:34.769598+00	2026-06-09 15:16:34.908875+00
68	AGENT-5F79C63BC2	T7.9 confidence routing test 447846	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T07:13:28.201336+00:00", "confidence": null, "campaign_id": 462, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T07:13:28.242712+00:00", "confidence": null, "campaign_id": 462, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T07:13:28.278245+00:00", "confidence": 0.568, "campaign_id": 462, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T07:13:28.278270+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	fe32203d58b94a4c	default	2026-06-09 07:13:28.180485+00	2026-06-09 07:13:28.286439+00
92	AGENT-7FF3433550	T7.9 confidence routing test e5b5c9	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T16:46:10.440798+00:00", "confidence": null, "campaign_id": 570, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T16:46:10.498942+00:00", "confidence": null, "campaign_id": 570, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T16:46:10.541349+00:00", "confidence": 0.568, "campaign_id": 570, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T16:46:10.541383+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	bff80b25d24649e8	default	2026-06-09 16:46:10.422778+00	2026-06-09 16:46:10.55188+00
84	AGENT-6989ED36EA	T7.9 confidence routing test 3d33ef	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T15:13:08.620680+00:00", "confidence": null, "campaign_id": 534, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T15:13:08.669430+00:00", "confidence": null, "campaign_id": 534, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T15:13:08.709870+00:00", "confidence": 0.568, "campaign_id": 534, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T15:13:08.709902+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	434c8a864e8142e4	default	2026-06-09 15:13:08.602452+00	2026-06-09 15:13:08.719596+00
80	AGENT-B3A880DEA2	T7.9 confidence routing test c1ca15	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T15:08:14.492818+00:00", "confidence": null, "campaign_id": 516, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T15:08:14.536095+00:00", "confidence": null, "campaign_id": 516, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T15:08:14.570086+00:00", "confidence": 0.568, "campaign_id": 516, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T15:08:14.570110+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	32961896242a40ac	default	2026-06-09 15:08:14.463063+00	2026-06-09 15:08:14.579339+00
140	AGENT-C57FEF7CE7	T7.9 confidence routing test d06d30	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T22:38:34.280144+00:00", "confidence": null, "campaign_id": 786, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T22:38:34.325619+00:00", "confidence": null, "campaign_id": 786, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T22:38:34.368088+00:00", "confidence": 0.568, "campaign_id": 786, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T22:38:34.368125+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	bb69c56b9e3f4e12	default	2026-06-09 22:38:34.264089+00	2026-06-09 22:38:34.378799+00
96	AGENT-22260E6081	T7.9 confidence routing test 56aa3b	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T16:53:35.878715+00:00", "confidence": null, "campaign_id": 588, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T16:53:35.937943+00:00", "confidence": null, "campaign_id": 588, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T16:53:35.976043+00:00", "confidence": 0.568, "campaign_id": 588, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T16:53:35.976073+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	2e3b324fdcf241c1	default	2026-06-09 16:53:35.864925+00	2026-06-09 16:53:35.985702+00
124	AGENT-34CC9AA2B1	T7.9 confidence routing test 1f52f4	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T21:52:43.306539+00:00", "confidence": null, "campaign_id": 714, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T21:52:43.355599+00:00", "confidence": null, "campaign_id": 714, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T21:52:43.389517+00:00", "confidence": 0.568, "campaign_id": 714, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T21:52:43.389543+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	6eff5372d11948a7	default	2026-06-09 21:52:43.293301+00	2026-06-09 21:52:43.398575+00
100	AGENT-93B7C360CC	T7.9 confidence routing test 018c52	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T20:58:35.320720+00:00", "confidence": null, "campaign_id": 606, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T20:58:35.365534+00:00", "confidence": null, "campaign_id": 606, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T20:58:35.405386+00:00", "confidence": 0.568, "campaign_id": 606, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T20:58:35.405410+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	962c71539a36488f	default	2026-06-09 20:58:35.305461+00	2026-06-09 20:58:35.413686+00
128	AGENT-342746B1F2	T7.9 confidence routing test fd4b07	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T22:00:58.623346+00:00", "confidence": null, "campaign_id": 732, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T22:00:58.670227+00:00", "confidence": null, "campaign_id": 732, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T22:00:58.707064+00:00", "confidence": 0.568, "campaign_id": 732, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T22:00:58.707105+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	b1606f87ba2e4d1b	default	2026-06-09 22:00:58.607539+00	2026-06-09 22:00:58.717008+00
132	AGENT-02B624184A	T7.9 confidence routing test dd136a	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T22:15:48.885480+00:00", "confidence": null, "campaign_id": 750, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T22:15:48.927783+00:00", "confidence": null, "campaign_id": 750, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T22:15:48.966120+00:00", "confidence": 0.568, "campaign_id": 750, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T22:15:48.966153+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	3fc27f1f197e4d6c	default	2026-06-09 22:15:48.872427+00	2026-06-09 22:15:48.97582+00
104	AGENT-CBFB388E15	T7.9 confidence routing test 4061a4	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T21:04:29.173107+00:00", "confidence": null, "campaign_id": 624, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T21:04:29.221316+00:00", "confidence": null, "campaign_id": 624, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T21:04:29.257662+00:00", "confidence": 0.568, "campaign_id": 624, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T21:04:29.257691+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	2272680eded740ad	default	2026-06-09 21:04:29.158878+00	2026-06-09 21:04:29.26705+00
108	AGENT-880ED3B32E	T7.9 confidence routing test 7785f4	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T21:09:12.630154+00:00", "confidence": null, "campaign_id": 642, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T21:09:12.673316+00:00", "confidence": null, "campaign_id": 642, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T21:09:12.714119+00:00", "confidence": 0.568, "campaign_id": 642, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T21:09:12.714143+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	8fed041272274e9d	default	2026-06-09 21:09:12.61451+00	2026-06-09 21:09:12.722231+00
112	AGENT-63B08A00CB	T7.9 confidence routing test f903c2	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T21:15:44.158535+00:00", "confidence": null, "campaign_id": 660, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T21:15:44.197950+00:00", "confidence": null, "campaign_id": 660, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T21:15:44.230981+00:00", "confidence": 0.568, "campaign_id": 660, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T21:15:44.231013+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	80806226726a4184	default	2026-06-09 21:15:44.143898+00	2026-06-09 21:15:44.240738+00
120	AGENT-05491D865E	T7.9 confidence routing test 47831a	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T21:35:13.071726+00:00", "confidence": null, "campaign_id": 696, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T21:35:13.133006+00:00", "confidence": null, "campaign_id": 696, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T21:35:13.183893+00:00", "confidence": 0.568, "campaign_id": 696, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T21:35:13.183931+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	7b25aefc67a345c0	default	2026-06-09 21:35:13.052755+00	2026-06-09 21:35:13.197574+00
136	AGENT-85C5DE9467	T7.9 confidence routing test 9fcbd2	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T22:27:20.656930+00:00", "confidence": null, "campaign_id": 768, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T22:27:20.703537+00:00", "confidence": null, "campaign_id": 768, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T22:27:20.746332+00:00", "confidence": 0.568, "campaign_id": 768, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T22:27:20.746360+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	e746b9d3d7ed4cb6	default	2026-06-09 22:27:20.635437+00	2026-06-09 22:27:20.757438+00
116	AGENT-C3242BB1DA	T7.9 confidence routing test 490b3c	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T21:22:56.553589+00:00", "confidence": null, "campaign_id": 678, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T21:22:56.593929+00:00", "confidence": null, "campaign_id": 678, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T21:22:56.630953+00:00", "confidence": 0.568, "campaign_id": 678, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T21:22:56.630975+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	4f97ab61a4bc4cd9	default	2026-06-09 21:22:56.539195+00	2026-06-09 21:22:56.641687+00
156	AGENT-A4FBA435AB	T7.9 confidence routing test f67a6b	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T23:59:18.075235+00:00", "confidence": null, "campaign_id": 858, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T23:59:18.122106+00:00", "confidence": null, "campaign_id": 858, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T23:59:18.158380+00:00", "confidence": 0.568, "campaign_id": 858, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T23:59:18.158417+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	e5027962a8374c03	default	2026-06-09 23:59:18.059636+00	2026-06-09 23:59:18.167427+00
144	AGENT-E1FBBE4772	T7.9 confidence routing test e0525e	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T23:04:41.126379+00:00", "confidence": null, "campaign_id": 804, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T23:04:41.214165+00:00", "confidence": null, "campaign_id": 804, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T23:04:41.279716+00:00", "confidence": 0.568, "campaign_id": 804, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T23:04:41.279769+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	c78194997a714003	default	2026-06-09 23:04:41.090633+00	2026-06-09 23:04:41.295967+00
148	AGENT-62476DFC6C	T7.9 confidence routing test ce0413	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T23:23:11.950219+00:00", "confidence": null, "campaign_id": 822, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T23:23:12.006205+00:00", "confidence": null, "campaign_id": 822, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T23:23:12.049914+00:00", "confidence": 0.568, "campaign_id": 822, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T23:23:12.049951+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	ff3acf08ad6846e5	default	2026-06-09 23:23:11.93624+00	2026-06-09 23:23:12.060573+00
152	AGENT-1F61887DC5	T7.9 confidence routing test ba695a	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-09T23:46:34.310013+00:00", "confidence": null, "campaign_id": 840, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-09T23:46:34.351094+00:00", "confidence": null, "campaign_id": 840, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-09T23:46:34.386999+00:00", "confidence": 0.568, "campaign_id": 840, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-09T23:46:34.387038+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	6dbe08012bf84c0a	default	2026-06-09 23:46:34.295673+00	2026-06-09 23:46:34.395454+00
160	AGENT-875BE35CFC	T7.9 confidence routing test e2bb38	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-10T00:18:35.004837+00:00", "confidence": null, "campaign_id": 876, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-10T00:18:35.047305+00:00", "confidence": null, "campaign_id": 876, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-10T00:18:35.088502+00:00", "confidence": 0.568, "campaign_id": 876, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-10T00:18:35.088529+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	2190da06f85d4d9c	default	2026-06-10 00:18:34.991516+00	2026-06-10 00:18:35.097127+00
164	AGENT-E256669EE2	T7.9 confidence routing test a24144	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-10T00:32:01.983786+00:00", "confidence": null, "campaign_id": 894, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-10T00:32:02.026832+00:00", "confidence": null, "campaign_id": 894, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-10T00:32:02.064813+00:00", "confidence": 0.568, "campaign_id": 894, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-10T00:32:02.064850+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	a2196b726a8a4d3a	default	2026-06-10 00:32:01.970922+00	2026-06-10 00:32:02.073447+00
168	AGENT-944155D6CE	T7.9 confidence routing test 7da769	{"channel": "survey", "segment": "gold", "fallback_order": []}	[{"action": "create_campaign", "routing": null, "iteration": 1, "reasoning": "created survey campaign for segment=gold", "timestamp": "2026-06-10T01:37:08.495600+00:00", "confidence": null, "campaign_id": 912, "metric_observed": null}, {"action": "execute_campaign", "routing": null, "iteration": 1, "reasoning": "runs_created=11 · skipped_consent=0 · skipped_segment=92", "timestamp": "2026-06-10T01:37:08.551419+00:00", "confidence": null, "campaign_id": 912, "metric_observed": null}, {"action": "measure", "routing": "manual_processing", "iteration": 1, "reasoning": "avg_outcome=0.60 · consent_rate=1.00 · cohorts={'gold': 11} · confidence=0.57 · routing=manual_processing", "timestamp": "2026-06-10T01:37:08.595089+00:00", "confidence": 0.568, "campaign_id": 912, "metric_observed": 0.6}, {"action": "halt_budget_exhausted", "routing": null, "iteration": 1, "reasoning": "iterations exhausted (1/1) · final metric 0.60", "timestamp": "2026-06-10T01:37:08.595120+00:00", "confidence": null, "campaign_id": null, "metric_observed": 0.6}]	1	1	0.6	1	0.6	1	t	halted	halt_budget_exhausted	05e7547d9c9e4658	default	2026-06-10 01:37:08.47783+00	2026-06-10 01:37:08.606516+00
\.


--
-- Data for Name: decision_corrections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.decision_corrections (id, correction_ref, run_ref, decision_iter, decision_action, ai_decision, human_decision, reason, reviewer, correlation_id, tenant_id, use_for_training, severity, created_at) FROM stdin;
\.


--
-- Data for Name: decision_feedback; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.decision_feedback (id, feedback_ref, run_ref, decision_iter, decision_action, feedback_kind, feedback_value, note, reviewer, correlation_id, tenant_id, created_at) FROM stdin;
\.


--
-- Name: autonomous_agent_runs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.autonomous_agent_runs_id_seq', 168, true);


--
-- Name: decision_corrections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.decision_corrections_id_seq', 93, true);


--
-- Name: decision_feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.decision_feedback_id_seq', 56, true);


--
-- Name: autonomous_agent_runs autonomous_agent_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autonomous_agent_runs
    ADD CONSTRAINT autonomous_agent_runs_pkey PRIMARY KEY (id);


--
-- Name: autonomous_agent_runs autonomous_agent_runs_run_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autonomous_agent_runs
    ADD CONSTRAINT autonomous_agent_runs_run_ref_key UNIQUE (run_ref);


--
-- Name: decision_corrections decision_corrections_correction_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_corrections
    ADD CONSTRAINT decision_corrections_correction_ref_key UNIQUE (correction_ref);


--
-- Name: decision_corrections decision_corrections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_corrections
    ADD CONSTRAINT decision_corrections_pkey PRIMARY KEY (id);


--
-- Name: decision_feedback decision_feedback_feedback_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_feedback
    ADD CONSTRAINT decision_feedback_feedback_ref_key UNIQUE (feedback_ref);


--
-- Name: decision_feedback decision_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_feedback
    ADD CONSTRAINT decision_feedback_pkey PRIMARY KEY (id);


--
-- Name: idx_autonomous_agent_runs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autonomous_agent_runs_status ON public.autonomous_agent_runs USING btree (status);


--
-- Name: idx_autonomous_agent_runs_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autonomous_agent_runs_tenant ON public.autonomous_agent_runs USING btree (tenant_id);


--
-- Name: idx_corrections_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_corrections_action ON public.decision_corrections USING btree (decision_action);


--
-- Name: idx_corrections_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_corrections_created ON public.decision_corrections USING btree (created_at DESC);


--
-- Name: idx_corrections_run_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_corrections_run_ref ON public.decision_corrections USING btree (run_ref);


--
-- Name: idx_corrections_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_corrections_severity ON public.decision_corrections USING btree (severity);


--
-- Name: idx_corrections_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_corrections_tenant ON public.decision_corrections USING btree (tenant_id);


--
-- Name: idx_feedback_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_created ON public.decision_feedback USING btree (created_at DESC);


--
-- Name: idx_feedback_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_kind ON public.decision_feedback USING btree (feedback_kind);


--
-- Name: idx_feedback_run_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_run_ref ON public.decision_feedback USING btree (run_ref);


--
-- Name: idx_feedback_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_tenant ON public.decision_feedback USING btree (tenant_id);


--
-- Name: idx_feedback_value; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_value ON public.decision_feedback USING btree (feedback_value);


--
-- PostgreSQL database dump complete
--

\unrestrict cUmHSwotRuydphdEDxFQbngGGBBZilN1s2tLXZBF2rovgjygi1dRfNJWoZmOvHI


import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { VercelIcon } from "./icons";

export const ProjectInfo = () => {
  return (
    <motion.div className="w-full px-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="rounded-3xl bg-white/84 p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-400">
              Ready
            </p>
            <p className="mt-2 text-base font-medium text-zinc-950">
              Start with a task or pick a quick action below.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-[#edf4ff] px-3 py-2 text-sm text-[#3155b2] shadow-[var(--shadow-soft)] transition-colors hover:bg-[#e6efff]"
            href="https://sdk.vercel.ai/docs/guides/computer-use"
            target="_blank"
          >
            Guide
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

// const Code = ({ text }: { text: string }) => {
//   return <code className="">{text}</code>;
// };

const DEPLOY_URL =
  "https://vercel.com/new/clone?project-name=AI+SDK+Computer+Use+Demo&repository-name=ai-sdk-computer-use&repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fai-sdk-computer-use&demo-title=AI+SDK+Computer+Use+Demo&demo-url=https%3A%2F%2Fai-sdk-computer-use.vercel.app%2F&demo-description=A+chatbot+application+built+with+Next.js+demonstrating+Anthropic+Claude+Sonnet+4.5+computer+use+capabilities+with+Vercel+Sandboxes&env=ANTHROPIC_API_KEY,SANDBOX_SNAPSHOT_ID";

export const DeployButton = () => {
  return (
    <Link
      target="_blank"
      href={DEPLOY_URL}
      className="flex flex-row gap-2 items-center bg-[#3f67d7] px-3 py-2 rounded-xl text-white hover:bg-[#355bc8] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-50"
    >
      <VercelIcon size={14} />
      Deploy
    </Link>
  );
};

export const DeployIconButton = () => {
  return (
    <Link
      aria-label="Deploy to Vercel"
      className="flex size-9 items-center justify-center rounded-full bg-[#3f67d7] text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[#355bc8]"
      href={DEPLOY_URL}
      target="_blank"
      title="Deploy"
    >
      <VercelIcon size={15} />
    </Link>
  );
};

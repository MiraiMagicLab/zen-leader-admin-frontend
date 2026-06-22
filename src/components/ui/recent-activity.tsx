'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { User, Download, Settings, Users } from 'lucide-react';

const activities = [
  {
    action: 'Admin login',
    user: 'admin',
    time: '2 minutes ago',
    icon: User,
    color: 'text-blue-500',
  },
  {
    action: 'Export student list',
    user: 'admin',
    time: '5 minutes ago',
    icon: Download,
    color: 'text-green-500',
  },
  {
    action: 'Course settings updated',
    user: 'admin',
    time: '10 minutes ago',
    icon: Settings,
    color: 'text-orange-500',
  },
  {
    action: 'New student registered',
    user: 'nguyen.van.a@zenleader.online',
    time: '15 minutes ago',
    icon: Users,
    color: 'text-purple-500',
  },
];

export const RecentActivity = memo(() => {
  return (
    <div className="border-border bg-card/40 rounded-xl border p-6">
      <h3 className="mb-4 text-xl font-semibold">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <motion.div
              key={`${activity.action}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="hover:bg-accent/50 flex items-start gap-3 rounded-lg p-3 transition-colors"
            >
              <div
                className={`bg-background flex size-8 shrink-0 items-center justify-center rounded-lg border ${activity.color}`}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{activity.action}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {activity.user}
                </p>
              </div>
              <span className="text-muted-foreground shrink-0 text-xs">
                {activity.time}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

RecentActivity.displayName = 'RecentActivity';

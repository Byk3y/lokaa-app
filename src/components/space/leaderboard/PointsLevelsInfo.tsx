import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info, ChevronDown, ChevronUp, ThumbsUp, MessageSquare, User, Award } from 'lucide-react';
import { LEVEL_THRESHOLDS } from '@/utils/levelUtils';

const PointsLevelsInfo: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <Card className="mb-6 bg-slate-50/50 border-slate-200">
            <CardHeader 
                className="flex flex-row items-center justify-between cursor-pointer select-none p-4" 
                onClick={() => setIsOpen(!isOpen)}
                role="button"
                aria-expanded={isOpen}
                aria-controls="points-info-content"
            >
                <div className="flex items-center">
                    <Info className="h-5 w-5 mr-2.5 text-blue-600" />
                    <CardTitle className="text-lg font-semibold text-slate-800">How Points & Levels Work</CardTitle>
                </div>
                {isOpen ? <ChevronUp className="h-5 w-5 text-slate-600" /> : <ChevronDown className="h-5 w-5 text-slate-600" />}
            </CardHeader>
            {isOpen && (
                <CardContent id="points-info-content" className="p-4 pt-0 text-sm text-slate-700">
                    <p className="mb-4">
                        Earn points by actively participating in this space! Your points contribute to your level and ranking on the leaderboard.
                    </p>
                    
                    <div className="space-y-3 mb-4">
                        <div className="flex items-start p-3 bg-white rounded-md border border-slate-200 shadow-sm">
                            <ThumbsUp className="h-5 w-5 mr-3 text-pink-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-slate-800">Liking Posts</h4>
                                <ul className="list-disc list-inside ml-1 mt-1 text-slate-600 space-y-0.5">
                                    <li><strong className="text-pink-600">+2 points</strong> for the post author when their post is liked.</li>
                                    <li><strong className="text-pink-600">+1 point</strong> for you when you like someone else's post.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-start p-3 bg-white rounded-md border border-slate-200 shadow-sm">
                            <MessageSquare className="h-5 w-5 mr-3 text-green-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-slate-800">Commenting on Posts</h4>
                                <ul className="list-disc list-inside ml-1 mt-1 text-slate-600 space-y-0.5">
                                    <li><strong className="text-green-600">+1 point</strong> for the post author when someone comments on their post.</li>
                                    <li><strong className="text-green-600">+2 points</strong> for you when you write a comment.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <h4 className="font-semibold text-slate-800 mb-2 flex items-center">
                            <Award className="h-5 w-5 mr-2 text-amber-500" /> Levels & Progression
                        </h4>
                        <p className="mb-3">
                            As you accumulate points, you'll advance through different levels. Here are the points required for each level:
                        </p>
                        <ul className="space-y-1.5">
                            {LEVEL_THRESHOLDS.filter(lt => lt.pointsRequired !== Infinity).map((threshold, index) => (
                                <li key={threshold.level} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-xs">
                                    <span className="font-medium text-slate-700">Level {threshold.level}: {threshold.name}</span>
                                    <span className="text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                                        {threshold.pointsRequired.toLocaleString()} points
                                        {LEVEL_THRESHOLDS[index+1] && LEVEL_THRESHOLDS[index+1].pointsRequired !== Infinity && 
                                            <span> - {(LEVEL_THRESHOLDS[index+1].pointsRequired -1).toLocaleString()} points</span>
                                        }
                                        {LEVEL_THRESHOLDS[index+1] && LEVEL_THRESHOLDS[index+1].pointsRequired === Infinity && 
                                            <span>+</span>
                                        }
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
            )}
        </Card>
    );
};

export default PointsLevelsInfo; 
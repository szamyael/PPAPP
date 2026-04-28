import { useState } from "react";
import { Heart, MessageCircle, User } from "lucide-react";
import { Button } from "./button";
import { Avatar } from "./avatar";
import { Badge } from "./badge";

interface UserCardProps {
  id: string;
  name: string;
  avatarUrl?: string;
  role: "student" | "tutor" | "admin" | "organization";
  bio?: string;
  organization?: string;
  subjects?: string[];
  hourlyRate?: number;
  rating?: number;
  reviewCount?: number;
  isFollowing?: boolean;
  onFollow?: (userId: string) => void;
  onMessage?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
  compact?: boolean;
}

export function UserCard({
  id,
  name,
  avatarUrl,
  role,
  bio,
  organization,
  subjects,
  hourlyRate,
  rating,
  reviewCount,
  isFollowing = false,
  onFollow,
  onMessage,
  onViewProfile,
  compact = false,
}: UserCardProps) {
  const [isFollowingLocal, setIsFollowingLocal] = useState(isFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    setIsLoading(true);
    try {
      await onFollow?.(id);
      setIsFollowingLocal(!isFollowingLocal);
    } finally {
      setIsLoading(false);
    }
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 bg-blue-600 text-white flex items-center justify-center rounded-full flex-shrink-0">
            {avatarUrl ? <img src={avatarUrl} alt={name} className="rounded-full" /> : initials}
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{name}</p>
            <p className="text-xs text-gray-500 truncate">{organization || role}</p>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {onMessage && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onMessage(id)}
              className="h-8 w-8 p-0"
              title="Message"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
          {onFollow && (
            <Button
              size="sm"
              variant={isFollowingLocal ? "default" : "outline"}
              onClick={handleFollow}
              disabled={isLoading}
              className="h-8 w-8 p-0"
              title={isFollowingLocal ? "Following" : "Follow"}
            >
              <Heart className={`h-4 w-4 ${isFollowingLocal ? "fill-current" : ""}`} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-12 w-12 bg-blue-600 text-white flex items-center justify-center rounded-full text-lg font-semibold flex-shrink-0">
            {avatarUrl ? <img src={avatarUrl} alt={name} className="rounded-full" /> : initials}
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-lg truncate">{name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Badge>
              {organization && <p className="text-xs text-gray-500">{organization}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Bio */}
      {bio && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{bio}</p>}

      {/* Tutor Info */}
      {role === "tutor" && (
        <div className="space-y-2 mb-3 pb-3 border-b border-gray-200">
          {subjects && subjects.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Subjects</p>
              <div className="flex flex-wrap gap-1">
                {subjects.slice(0, 3).map((subject) => (
                  <Badge key={subject} variant="secondary" className="text-xs">
                    {subject}
                  </Badge>
                ))}
                {subjects.length > 3 && <Badge variant="secondary" className="text-xs">+{subjects.length - 3}</Badge>}
              </div>
            </div>
          )}
          {hourlyRate && (
            <p className="text-sm font-semibold">
              <span className="text-gray-600">Rate: </span>
              ₱{hourlyRate}/hour
            </p>
          )}
          {rating !== undefined && (
            <div className="flex items-center gap-2">
              <div className="flex text-yellow-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < Math.round(rating) ? "text-yellow-400" : "text-gray-300"}>
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {rating.toFixed(1)} {reviewCount && `(${reviewCount} reviews)`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onViewProfile && (
          <Button variant="outline" className="flex-1" onClick={() => onViewProfile(id)}>
            <User className="h-4 w-4 mr-2" />
            View Profile
          </Button>
        )}
        {onMessage && (
          <Button variant="outline" className="flex-1" onClick={() => onMessage(id)}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Message
          </Button>
        )}
        {onFollow && (
          <Button
            variant={isFollowingLocal ? "default" : "outline"}
            className="flex-1"
            onClick={handleFollow}
            disabled={isLoading}
          >
            <Heart className={`h-4 w-4 mr-2 ${isFollowingLocal ? "fill-current" : ""}`} />
            {isFollowingLocal ? "Following" : "Follow"}
          </Button>
        )}
      </div>
    </div>
  );
}
